import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ExternalLink, Maximize2 } from 'lucide-react';
import { Card, CardContent, Button } from '@hedera-africa/ui';

interface ParcelMapProps {
  latitude: number;
  longitude: number;
  title: string;
  className?: string;
  interactive?: boolean;
}

const ParcelMap: React.FC<ParcelMapProps> = ({
  latitude,
  longitude,
  title,
  className,
  interactive = false,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Use OpenStreetMap tiles for the map
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/pin-s-l+00D17A(${longitude},${latitude})/${longitude},${latitude},15,0/800x600@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`;

  const openInMaps = () => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const openFullscreen = () => {
    const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    // Preload map image
    const img = new Image();
    img.onload = () => setMapLoaded(true);
    img.onerror = () => setMapError(true);
    img.src = mapUrl;
  }, [mapUrl]);

  return (
    <Card className={className}>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-400" />
            <h3 className="font-heading text-lg font-semibold text-white">
              Localisation
            </h3>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={openFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={openInMaps}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="aspect-video rounded-lg overflow-hidden mb-4 relative"
        >
          {!mapLoaded && !mapError && (
            <div className="w-full h-full bg-dark-700/30 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          )}

          {mapError || !mapLoaded ? (
            <div className="w-full h-full bg-dark-700/30 flex items-center justify-center border border-dark-600/30 rounded-lg">
              <div className="text-center">
                <div className="p-3 bg-primary-500/20 rounded-lg mx-auto mb-3 w-fit">
                  <MapPin className="h-8 w-8 text-primary-400" />
                </div>
                <p className="text-white font-medium">{latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
                <p className="text-gray-400 text-sm">Coordonnées GPS</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openInMaps}>
                  Voir sur Google Maps
                </Button>
              </div>
            </div>
          ) : (
            <img
              src={mapUrl}
              alt={`Carte de ${title}`}
              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={openFullscreen}
            />
          )}

          {interactive && (
            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Button variant="outline" onClick={openFullscreen}>
                <Maximize2 className="h-4 w-4 mr-2" />
                Agrandir
              </Button>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Latitude:</span>
            <p className="text-white font-mono font-semibold">
              {latitude.toFixed(6)}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Longitude:</span>
            <p className="text-white font-mono font-semibold">
              {longitude.toFixed(6)}
            </p>
          </div>
        </div>

        {/* Additional map actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={openInMaps} className="flex-1">
            Google Maps
          </Button>
          <Button variant="outline" size="sm" onClick={openFullscreen} className="flex-1">
            OpenStreetMap
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParcelMap;