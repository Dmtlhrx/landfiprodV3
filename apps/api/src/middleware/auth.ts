import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../config/database.js";

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Vérifie et décode le JWT
    const payload = await request.jwtVerify<{ userId: string }>();

    // Cherche l'utilisateur dans la base
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      reply.code(401).send({ error: "User not found" });
      return; // Important: stop execution after sending response
    }

    // Attache l'utilisateur au request avec userId
    request.user = {
      userId: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (err) {
    reply.code(401).send({ error: "Invalid token" });
    return; // Important: stop execution after sending response
  }
}

export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user || request.user.role !== "ADMIN") {
    reply.code(403).send({ error: "Admin access required" });
    return; // Important: stop execution
  }
}