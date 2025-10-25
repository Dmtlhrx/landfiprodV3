import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  
  interface FastifyRequest {
    user?: {
      userId: string;
      id: string;
      email: string;
      role: string;
      [key: string]: any;
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { 
      userId: string;
      [key: string]: any; 
    };
    user: { 
      userId: string;
      [key: string]: any; 
    };
  }
}