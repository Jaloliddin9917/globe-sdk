# Foobar

Foobar is a Python library for dealing with word pluralization.

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

```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)