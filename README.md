

USAGE

import React, { useEffect, useRef } from 'react';
import { MapSDK } from './components'; // the path to your MapSDK file


const options: any = {
  map: {
    coordinates: {
      latitude: 0,
      longitude: 0
    }
  },
};

const MapComponent: React.FC = () => {
  const mapContainerRef: any = useRef(null);
  const mapSDKRef: any = useRef(null);

  useEffect(() => {
    mapSDKRef.current = new MapSDK(mapContainerRef.current);
    mapSDKRef.current.init(options);

    return () => {
      mapSDKRef.current?.destroy();
    };
  }, []);

  return (
    <>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100vh' }} />
    </>
  )



};

export default MapComponent;
