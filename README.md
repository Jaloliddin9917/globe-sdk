# Globe map sdk

Map sdk use only globe server 

## Installation

Use the package manager [npm](https://www.npmjs.com) to install foobar.

```bash
npm i globe-sdk-leafet 
yarn add globe-sdk-leafet 
```

## Usage

```typescript
import React, { useEffect, useRef } from 'react';
import { MapSDK } from 'globe-sdk-leafet'; // the path to your MapSDK file
import "leaflet/dist/leaflet.css";
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import "globe-sdk-leafet/css/leaflet-sidebar.css";
import "globe-sdk-leafet/css/leaflet-sidebar.min.css";


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
  const mapSDKRef:any = useRef(null);

  useEffect(() => {
    mapSDKRef.current = new MapSDK(mapContainerRef.current);
    mapSDKRef.current.init(options);

    mapSDKRef.current.onShapeCreated((shape, layer) => {
      if (shape === 'Marker') {
        const geojson = layer.toGeoJSON();
        console.log(geojson);
      } else if (shape === 'Circle') {
        const geojson = layer.toGeoJSON();
        console.log(geojson);
      } else if (shape === 'Polygon' || shape === 'Rectangle' || shape === 'Polyline') {
        const geojson = layer.toGeoJSON();
        console.log(geojson);
      }
    });


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

```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)