import * as L from "leaflet";
import 'leaflet/dist/leaflet.css';
import 'leaflet-sidebar-v2';
import "./css/leaflet-sidebar.css";
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

export type MapSDKOptions = {
    map: {
        coordinates: any;
        defaultZoom: number;
        onMapClick?: () => void;
    };
    tile: {
        url: string;
        attribution: string;
    };
    clusterMarkers?: ILayer[];
    markers?: ILayer[];
    lines?: ILayer[];
    circles?: ILayer[];
    polygons?: ILayer[];
    routes?: ILayer[];
};

interface ILayer {
    type: string,
    features: [
        {
            type: string,
            properties: {},
            geometry: {
                coordinates: [],
                type: string
            }
        }
    ]
}



interface IOptions {
    map: {
        coordinates: {
            latitude: number;
            longitude: number;
        }
    };
}

interface IProject {
    Id: string;
    Name: string;
}

interface ILayer {
    id: string;
    name: string;
    data_type: string;
}

export class MapSDK {
    private container: HTMLElement;
    private options: any;
    private map: L.Map;
    private popup: any;

    private markerLayerGroup: L.LayerGroup;
    private polygonLayerGroup: L.LayerGroup;

    private baseLayers: { [name: string]: L.TileLayer };

    private sidebar: L.Control.Sidebar;



    constructor(container: HTMLElement) {
        this.container = container;
        this.map = L.map(this.container, { zoomControl: false });
        // Initialize layer groups here
        this.markerLayerGroup = L.layerGroup();
        this.polygonLayerGroup = L.layerGroup();

        this.baseLayers = {};
        (window as any).mapSDK = this;

        this.sidebar = L.control.sidebar({
            autopan: true,
            closeButton: true,
            container: 'sidebar',
            position: 'left',
        }).addTo(this.map);

        this.map.pm.addControls({
            position: 'topright',
        });

        this.renderOptions()
            .then(options => {
                this.sidebar
                    .addPanel({
                        id: 'js-api',
                        tab: '<div class="icon-tt"></div>',
                        title: 'Layers',
                        pane: options
                    });
            })
            .catch(error => console.error('Failed to render options:', error));

    }

    init(options: IOptions): void {
        this.options = { ...options };

        this.map.setView([options.map.coordinates.latitude, options.map.coordinates.longitude], 1);


        const tileLayer2 = this.addTileLayer("https://{s}.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}&hl=en", { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] });
        this.baseLayers['Traffic'] = tileLayer2;
        const tileLayer3 = this.addTileLayer("http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}&hl=en", { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] });
        this.baseLayers['Hybrid'] = tileLayer3;
        const tileLayer = this.addTileLayer("http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en", { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] });
        this.baseLayers['Streets'] = tileLayer;

        // Add the layer groups to the map here
        this.markerLayerGroup.addTo(this.map);
        this.polygonLayerGroup.addTo(this.map);

        L.control.layers(this.baseLayers).addTo(this.map);

    }



    async renderOptions(): Promise<string> {
        const projects = await this.fetchProjects();

        const projectOptions = projects.map((project) => `<option value="${project.Id}">${project.Name}</option>`).join('');

        return `
        <label class="select-label" for="project-select">Select project</label>
        <div class="select">
            <select class="classic" id="project-select" onchange="mapSDK.handleProjectChange(this.value)">
                ${projectOptions}
            </select>
        </div>
        <label for="layer-select">Select layer</label>
        <div class="select">
            <select class="classic" id="layer-select" onchange="mapSDK.handleLayerChange(this.value)">
                <!-- layers will be populated dynamically -->
            </select>
        </div>
    `;
    }


    async fetchProjects(): Promise<IProject[]> {
        const response = await fetch('http://localhost:7020/projects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const projects = await response.json();
        return projects;
    }

    async fetchLayers(url: string): Promise<ILayer[]> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const layers = await response.json();
        return layers;
    }


    async handleProjectChange(projectId: string): Promise<void> {
        console.log('Selected project:', projectId);
        try {
            const layers = await this.fetchLayers(`http://localhost:7020/layers/${projectId}`);
            this.setLayers(layers);
        } catch (error) {
            console.error('Failed to fetch layers for project:', error);
        }
    }

    async handleLayerChange(layer: any): Promise<void> {
        let layers = JSON.parse(layer)
        console.log('Selected layer:', layers);
        try {
            if (layers.data_type === "point") {
                await this.fetchMarkers(`http://localhost:7020/layer/data/${layers.id}`);
            }
            if (layers.data_type === "polygon") {
                await this.fetchPolygons(`http://localhost:7020/layer/data/${layers.id}`);
            }
        } catch (error) {
            console.error('Failed to fetch layers for project:', error);
        }
    }


    async fetchMarkers(url: string): Promise<void> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const markers = await response.json() as any[];
        this.setCircle(markers);
        // this.sidebar.setContent('Polygons fetched and set.'); // Displaying a message in the sidebar
    }

    async fetchPolygons(url: string): Promise<void> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const polygons = await response.json() as any[];
        this.setPolygons(polygons);
    }

    setLayers(layers: any[]): void {
        // Clear the current layers from the select
        const select: any = document.getElementById('layer-select');
        select.innerHTML = '';

        // Add the new layers to the select
        layers.forEach(layer => {
            const option = document.createElement('option');
            option.value = JSON.stringify(layer);
            option.textContent = layer.name;
            select.appendChild(option);
        });
    }
    addTileLayer(url: string, options?: L.TileLayerOptions): L.TileLayer {
        const tileLayer = L.tileLayer(url, options);
        tileLayer.addTo(this.map);
        return tileLayer;
    }

    // Symbology LAyers
    setCircle(markers: any[]): void {
        this.polygonLayerGroup.clearLayers();
        this.markerLayerGroup.clearLayers();
        Array.from(markers).forEach((pin: any) => {
            const pointOptions = {
                radius: 4,
                stroke: false,
                color: pin?.properties?.color,
                weight: 1,
                opacity: 1,
                fill: true,
                fillOpacity: 1,
            }
            const circleMarker = L.circleMarker([
                pin?.geometry?.coordinates[1],
                pin?.geometry?.coordinates[0],
            ], pointOptions).addTo(this.markerLayerGroup);
            // this.map.flyTo([circleMarker.getLatLng().lat, circleMarker.getLatLng().lng], 6);            
            return () => this.markerLayerGroup.removeLayer(circleMarker);
        });

    }
    setMarkers(markers: any[]): void {
        this.polygonLayerGroup.clearLayers();
        this.markerLayerGroup.clearLayers();
        Array.from(markers).forEach((pin: any) => {
            const pointOptions = {
                radius: 4,
                stroke: false,
                color: pin?.properties?.color,
                weight: 1,
                opacity: 1,
                fill: true,
                fillOpacity: 1,
            }
            const circleMarker = L.circleMarker([
                pin?.geometry?.coordinates[1],
                pin?.geometry?.coordinates[0],
            ], pointOptions).addTo(this.markerLayerGroup);
            this.map.flyTo([circleMarker.getLatLng().lat, circleMarker.getLatLng().lng], 6);
            return () => this.markerLayerGroup.removeLayer(circleMarker);
        });

    }
    setPolygons(polygons: any[]): void {
        this.markerLayerGroup.clearLayers();
        this.polygonLayerGroup.clearLayers();

        Array.from(polygons).forEach((polygon: any) => {
            const polystyle = () => {
                return {
                    fillColor: polygon?.properties?.color || "blue",
                    weight: 1,
                    opacity: 1,
                    color: 'white',  //Outline color
                    fillOpacity: 0.8
                };
            }
            const geojson = L.geoJSON(polygon, { style: polystyle }).addTo(this.polygonLayerGroup);
            this.map.flyTo([geojson.getBounds().getCenter().lat, geojson.getBounds().getCenter().lng], 6);

            return () => this.polygonLayerGroup.removeLayer(geojson);
        });
    }

    onShapeCreated(callback: (shape: string, layer: L.Layer) => void): void {
        this.map.on('pm:create', (event) => {
            callback(event.shape, event.layer);
        });
    }

    private onMapClick(e: any) {
        this.popup
            .setLatLng(e.latlng)
            .setContent("You clicked the map at " + e.latlng.toString())
            .openOn(this.map);
    }

    destroy(): void {
        this.map.off();
        this.map.remove();
    }
}
