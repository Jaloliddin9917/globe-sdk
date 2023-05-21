import * as L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import "leaflet-sidebar-v2";
import "./css/leaflet-sidebar.css";
import "./css/leaflet-sidebar.min.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";

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
  type: string;
  features: [
    {
      type: string;
      properties: {};
      geometry: {
        coordinates: [];
        type: string;
      };
    }
  ];
}

interface IOptions {
  map: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
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
  private routingControl: L.Routing.Control;

  constructor(container: HTMLElement) {
    this.container = container;
    this.map = L.map(this.container, { zoomControl: false });
    // Initialize layer groups here
    this.markerLayerGroup = L.layerGroup();
    this.polygonLayerGroup = L.layerGroup();

    this.baseLayers = {};
    (window as any).mapSDK = this;

    this.sidebar = L.control
      .sidebar({
        autopan: true,
        closeButton: true,
        container: "sidebar",
        position: "left",
      })
      .addTo(this.map);

    this.routingControl = L.Routing.control({
      waypoints: [],
      routeWhileDragging: true,
      show: false,
      collapsible: true,
      addWaypoints: true,
      fitSelectedRoutes: true,
      showAlternatives: true,
    }).addTo(this.map);

    this.map.pm.addControls({
      position: "topright",
    });

    this.renderOptions()
      .then((options) => {
        this.sidebar?.addPanel({
          id: "js-api",
          tab: '<div class="icon-tt"></div>',
          title: "Layers",
          pane: options,
        });
      })
      .catch((error) => console.error("Failed to render options:", error));
  }

  init(options: IOptions): void {
    this.options = { ...options };

    this.map.setView(
      [options.map.coordinates.latitude, options.map.coordinates.longitude],
      1
    );

    L.Marker.prototype.options.icon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    });

    const tileLayer2 = this.addTileLayer(
      "https://{s}.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}&hl=en",
      { subdomains: ["mt0", "mt1", "mt2", "mt3"] }
    );
    this.baseLayers["Traffic"] = tileLayer2;
    const tileLayer3 = this.addTileLayer(
      "http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}&hl=en",
      { subdomains: ["mt0", "mt1", "mt2", "mt3"] }
    );
    this.baseLayers["Hybrid"] = tileLayer3;
    const tileLayer = this.addTileLayer(
      "http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=en",
      { subdomains: ["mt0", "mt1", "mt2", "mt3"] }
    );
    this.baseLayers["Streets"] = tileLayer;

    // Add the layer groups to the map here
    this.markerLayerGroup.addTo(this.map);
    this.polygonLayerGroup.addTo(this.map);

    L.control
      .layers(this.baseLayers, undefined, { position: "topleft" })
      .addTo(this.map);
  }

  async renderOptions(): Promise<string> {
    const projects = await this.fetchProjects();

    const projectOptions = projects
      ?.map(
        (project) => `<option value="${project.Id}">${project.Name}</option>`
      )
      .join("");

    return `
    <label class="select-label" for="project-select">Select project</label>
    <div class="select">
        <select class="classic" id="project-select" onchange="mapSDK.handleProjectChange(this.value)">
            ${projectOptions}
        </select>
    </div>
    <fieldset class="check-layer" id="layer-select">
     <legend>Select layers</legend>
        <!-- layers will be populated dynamically -->
    </fieldset>
    `;
  }


  renderOption(layers: any[]): void {
    // Clear the current layers from the select
    const container: any = document.getElementById("layer-select");
    container.innerHTML = "";

    // Add the new layers to the container as checkboxes
    layers.forEach((layer) => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = JSON.stringify(layer);
      checkbox.id = `layer-checkbox-${layer.id}`; // Assume each layer has a unique id
      checkbox.onchange = () => this.handleLayerChange({
        id: layer.id,
        checked: checkbox.checked,
        layer: JSON.parse(checkbox.value),
      });
      const label = document.createElement('label');
      label.htmlFor = `layer-checkbox-${layer.id}`;
      label.appendChild(document.createTextNode(layer.name));

      // Append checkbox and label to the container
      container.appendChild(checkbox);
      container.appendChild(label);
      container.appendChild(document.createElement("br")); // Add a line break for readability
    });
  }


  async fetchProjects(): Promise<IProject[]> {
    const response = await fetch("http://localhost:7020/projects");
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
    console.log("Selected project:", projectId);
    try {
      const layers = await this.fetchLayers(
        `http://localhost:7020/layers/${projectId}`
      );
      this.renderOption(layers);
    } catch (error) {
      console.error("Failed to fetch layers for project:", error);
    }
  }

  async handleLayerChange(layerData: { id: string, checked: boolean, layer: any }): Promise<void> {
    let { layer, checked, id } = layerData
    console.log("Selected layer:", layer, checked);
    console.log(this.markerLayerGroup);
    try {
      if (layer.data_type === "point") {
        if (checked === true) {
          await this.fetchMarkers(
            `http://localhost:7020/layer/data/${layer.id}`
          );
        } else {
          this.markerLayerGroup.clearLayers();
        }
      }
      if (layer.data_type === "polygon") {
        if (checked === true) {
          await this.fetchPolygons(
            `http://localhost:7020/layer/data/${layer.id}`
          );
        } else {
          this.polygonLayerGroup.clearLayers();
        }
      }
    } catch (error) {
      console.error("Failed to fetch layers for project:", error);
    }
  }

  async fetchMarkers(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const markers = (await response.json()) as any[];
    // this.setMarkerCluster(markers);
    this.setMarkers(markers);
  }

  async fetchPolygons(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const polygons = (await response.json()) as any[];
    this.setPolygons(polygons);
  }


  addTileLayer(url: string, options?: L.TileLayerOptions): L.TileLayer {
    const tileLayer = L.tileLayer(url, options);
    tileLayer.addTo(this.map);
    return tileLayer;
  }

  // Symbology Layers
  setCircles(markers: any[]): void {
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
      };

      // Start the popup content
      let popupContent =
        '<h4 class="text-primary">Street Light</h4>' +
        '<div class="container"><table class="table table-striped">' +
        "<thead><tr><th>Properties</th><th>Value</th></tr></thead><tbody>";

      // Add a row for each property in the pin.properties object
      for (let prop in pin.properties) {
        if (pin.properties.hasOwnProperty(prop)) {
          if (prop === "imageUrl") {
            // Handle the imageUrl property differently
            popupContent += `</tbody></table><img src="${pin.properties[prop]}" alt="Image" width="200px" height="200px"></div>`;
          } else {
            let value = pin.properties[prop].toString().substring(0, 15);
            popupContent += `<tr><td>${prop}</td><td>${value}</td></tr>`;
          }
        }
      }

      // Close the popup content
      popupContent += "</tbody></table></div>";

      const circleMarker = L.circleMarker(
        [pin?.geometry?.coordinates[1], pin?.geometry?.coordinates[0]],
        pointOptions
      )
        .bindPopup(popupContent)
        .addTo(this.markerLayerGroup);
      this.map.flyTo(
        [circleMarker.getLatLng().lat, circleMarker.getLatLng().lng],
        6
      );
      return () => this.markerLayerGroup.removeLayer(circleMarker);
    });
  }
  setMarkers(markers: any[]): void {
    this.markerLayerGroup.clearLayers();
    Array.from(markers).forEach((pin: any) => {
      const cuffs = new L.Icon({
        iconUrl: pin?.properties?.color_or_img
          ? pin?.properties?.color_or_img
          : "https://freesvg.org/img/ts-map-pin.png",
        iconSize: [25, 25],
      });

      // Start the popup content
      let popupContent =
        '<h4 class="text-primary">Street Light</h4>' +
        '<div class="container"><table class="table table-striped">' +
        "<thead><tr><th>Properties</th><th>Value</th></tr></thead><tbody>";

      // Add a row for each property in the pin.properties object
      for (let prop in pin.properties) {
        if (pin.properties.hasOwnProperty(prop)) {
          if (prop === "imageUrl") {
            // Handle the imageUrl property differently
            popupContent += `</tbody></table><img src="${pin.properties[prop]}" alt="Image" width="200px" height="200px"></div>`;
          } else {
            let value = pin.properties[prop].toString().substring(0, 15);
            popupContent += `<tr><td>${prop}</td><td>${value}</td></tr>`;
          }
        }
      }

      // Close the popup content
      popupContent += "</tbody></table></div>";

      const marker = L.marker(
        [pin?.geometry?.coordinates[1], pin?.geometry?.coordinates[0]],
        { icon: cuffs }
      )
        .bindPopup(popupContent)
        .addTo(this.markerLayerGroup);

      this.map.flyTo([marker.getLatLng().lat, marker.getLatLng().lng], 6);
      return () => this.markerLayerGroup.removeLayer(marker);
    });
  }
  setPolygons(polygons: any[]): void {
    this.polygonLayerGroup.clearLayers();

    Array.from(polygons).forEach((polygon: any) => {
      const polystyle = () => {
        return {
          fillColor: polygon?.properties?.color || "blue",
          weight: 1,
          opacity: 1,
          color: "white", //Outline color
          fillOpacity: 0.8,
        };
      };
      const geojson = L.geoJSON(polygon, { style: polystyle }).addTo(
        this.polygonLayerGroup
      );
      this.map.flyTo(
        [
          geojson.getBounds().getCenter().lat,
          geojson.getBounds().getCenter().lng,
        ],
        6
      );

      return () => this.polygonLayerGroup.removeLayer(geojson);
    });
  }
  setHeatLayer(markers: any[]): void {
    this.markerLayerGroup.clearLayers();
    const points: any = markers.map((p) => {
      return [p.geometry?.coordinates[1], p.geometry?.coordinates[0]];
    });
    let heatmapOptions = {
      radius: 15,
      blur: 20,
      maxZoom: 10,
      gradient: {
        0.4: "blue",
        0.6: "green",
        0.8: "yellow",
        1.0: "red",
      },
    };

    L.heatLayer(points, heatmapOptions).addTo(this.markerLayerGroup);
  }
  setMarkerCluster(cluster: any[]): void {
    this.markerLayerGroup.clearLayers();
    // @ts-ignore
    const markers = L.markerClusterGroup();
    Array.from(cluster).forEach((pin: any) => {
      const cuffs = new L.Icon({
        iconUrl: "https://freesvg.org/img/ts-map-pin.png",
        iconSize: [25, 25],
      });
      const marker = L.marker(
        [pin?.geometry?.coordinates[1], pin?.geometry?.coordinates[0]],
        { icon: cuffs }
      );
      this.map.flyTo([marker.getLatLng().lat, marker.getLatLng().lng], 6);
      // @ts-ignore
      markers.addLayer(marker);
    });
    this.markerLayerGroup.addLayer(markers);
  }
  setRouting(waypoints: { lat: number; lng: number }[]): void {
    let leafletWaypoints = waypoints.map((wp) => L.latLng(wp.lat, wp.lng));
    this.routingControl.setWaypoints(leafletWaypoints);
  }
  clearRouting(): void {
    this.routingControl.setWaypoints([]);
  }

  onShapeCreated(callback: (shape: string, layer: L.Layer) => void): void {
    this.map.on("pm:create", (event: any) => {
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
