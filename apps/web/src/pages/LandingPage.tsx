import React, { Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Shield, 
  Globe, 
  DollarSign,
  FileCheck,
  Users,
  TrendingUp,
  Play,
  X
} from 'lucide-react';
import { Button, BeninPatternBackground, NeonDivider, StatKPI } from '@hedera-africa/ui';
import Hero3D from '@/components/Hero3D';
import { useTranslation } from 'react-i18next';

// Modal vidéo YouTube
const VideoModal = ({ isOpen, onClose, videoId = "VJq1t1nyS0c" }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute -top-12 right-0 text-white hover:text-primary-400 transition-colors p-2 rounded-full hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Video container */}
              <div className="glass rounded-2xl overflow-hidden shadow-2xl shadow-primary-500/20 border border-primary-500/20">
                <div className="relative w-full aspect-video bg-dark-950">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                    title="LandFi Demo Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Video info */}
                <div className="p-4 bg-gradient-to-br from-dark-900/90 to-dark-950/90">
                  <h3 className="font-heading text-xl font-bold text-white mb-1">
                    LandFi Platform Demo
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Discover how our platform revolutionizes land ownership through blockchain technology
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// Composant miniature vidéo
const VideoThumbnail = ({ onClick, videoId = "VJq1t1nyS0c" }) => {
  // Précharger la miniature au chargement
  React.useEffect(() => {
    const img = new Image();
    img.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }, [videoId]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="relative group rounded-2xl overflow-hidden bg-black shadow-2xl shadow-primary-500/20 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative w-full aspect-video bg-dark-950">
        <img
          src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
          loading="eager"
          onError={(e) => {
            e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }}
        />
        
        {/* Overlay dégradé */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/40 transition-all duration-300" />

        {/* Bouton Play Central */}
        <motion.div
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          className="absolute inset-0 flex items-center justify-center z-20"
        >
          <div className="w-20 h-20 rounded-full bg-primary-500/90 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary-400/90 transition-colors shadow-lg shadow-primary-500/50">
            <Play className="h-10 w-10 text-white fill-white ml-1" />
          </div>
        </motion.div>

        {/* Badge Premium */}
        <div className="absolute top-4 right-4 bg-gradient-to-r from-primary-500 to-secondary-500 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-semibold shadow-lg shadow-primary-500/50">
          ▶ DEMO HD
        </div>
      </div>
    </motion.div>
  );
};

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const features = [
    {
      icon: FileCheck,
      title: 'HTS Tokenization',
      description: 'Transform your plots into secure NFTs on Hedera',
    },
    {
      icon: Shield,
      title: 'HCS Traceability',
      description: 'Immutable history of all transactions',
    },
    {
      icon: Users,
      title: 'DID Identity',
      description: 'Verified decentralized identity system',
    },
    {
      icon: DollarSign,
      title: 'Integrated DeFi',
      description: 'NFT collateral loans and optimized liquidity',
    },
  ];

  const stats = [
    { icon: Globe, title: 'Tokenized Plots', value: '2,847' },
    { icon: DollarSign, title: 'Total Volume', value: '$12.4M' },
    { icon: TrendingUp, title: 'Active Loans', value: '156' },
    { icon: Users, title: 'Users', value: '1,234' },
  ];

  return (
    <div className="min-h-screen bg-dark-950 relative overflow-hidden">
      <BeninPatternBackground className="fixed inset-0" />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <Suspense fallback={null}>
          <Hero3D />
        </Suspense>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-heading text-5xl md:text-7xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
              Revolutionize
            </span>
            <br />
            <span className="text-white">Land Ownership</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Tokenize your land. Get an express loan or find offers from the community - simple and secure
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/auth">
              <Button size="lg" className="neon-glow-hover">
                {t('landing.cta.launch')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setIsVideoModalOpen(true)}
            >
              <Play className="mr-2 h-5 w-5" />
              {t('landing.cta.demo')}
            </Button>
          </motion.div>
        </div>
      </section>

      <NeonDivider className="my-20" />

      {/* Video Demo Section */}
      <section className="relative py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mb-12"
          >
            <h2 className="font-heading text-4xl font-bold text-white text-center mb-4">
              See It In Action
            </h2>
            <p className="text-xl text-gray-400 text-center max-w-2xl mx-auto">
              Experience the future of decentralized land ownership with our interactive demo
            </p>
          </motion.div>

          <VideoThumbnail onClick={() => setIsVideoModalOpen(true)} />
        </div>
      </section>

      <NeonDivider className="my-20" />

      {/* Stats Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <StatKPI
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  className="hover:scale-105"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <NeonDivider className="my-20" />

      {/* Features Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-4xl font-bold text-white mb-4">
              Cutting-Edge Technologies
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Harness the power of Hedera Hashgraph for transparent and secure land ownership
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass p-6 rounded-xl hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300"
              >
                <div className="p-3 bg-primary-500/20 rounded-lg w-fit mb-4">
                  <feature.icon className="h-6 w-6 text-primary-400" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="glass p-12 rounded-2xl"
          >
            <h2 className="font-heading text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-400 mb-8">
              Join the decentralized land ownership revolution
            </p>
            <Link to="/auth">
              <Button size="lg" className="neon-glow-hover">
                Create an Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoId="VJq1t1nyS0c"
      />
    </div>
  );
};

export default LandingPage;