import { Component, OnInit, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { loadModules } from 'esri-loader';
import { Subject } from 'rxjs/Subject';
import esri = __esri;

@Component({
  selector: 'app-esri-map',
  templateUrl: './esri-map.component.html',
  styleUrls: ['./esri-map.component.css']
})

export class EsriMapComponent implements OnInit {

  // Private vars with default values
  private _zoom = 7;
  private _center = [-27, 153];
  private _opacity = 0.6;
  private maps = {
    topo: null,
    streets: null,
    satellite: null
  };

  private mapView: esri.MapView;
  private locationLoading = false;
  private _currentMap = 'streets';
  private featureLayer
  private trackWidget;
  //pointers to Esri classes
  private Point;
  private Circle;
  private Graphic;


  @Input()
    set zoom(zoom: number) {
      this._zoom = zoom;
    }

    get zoom(): number {
      return this._zoom;
    }

  @Input()
    set center(center: any[]) {
      this._center = center;
    }

    get center(): any[] {
      return this._center;
    }

  @Input() _mapSelected: Subject<string>;
  @Input() _opacityChanged: Subject<number>;

  @Output() mapLoaded = new EventEmitter<boolean>();

  // this is needed to be able to create the MapView at the DOM element in this component
  @ViewChild('mapViewNode') private mapViewEl: ElementRef;

  constructor() { }

  public ngOnInit() {
    console.log('oninit');
    this._mapSelected.subscribe(mapType => {
      this.mapView.map = this.maps[mapType];
      this.mapView.map.add(this.featureLayer);
    })
    this._opacityChanged.subscribe(opacity => {
      this.featureLayer.opacity = opacity;
    })


    loadModules([
      'esri/Map',
      'esri/views/MapView',
      'esri/layers/FeatureLayer',
      'esri/geometry/Point',
      'esri/widgets/Track',
      'esri/Graphic'
    ])
    .then(([EsriMap, EsriMapView, FeatureLayer, Point, Track, Graphic]) => {
      
      this.Point = Point;
      this.Graphic = Graphic;

      let popupTemplate = {
        title: "Subregion: {IBRA_SUB_N}",
        content: `
        <h4>Details of this subregion:</h4>
        <p><b>State</b>: {STATE}</p>
        <i>Todo: Find more information</i>
        `
      };

      this.featureLayer = new FeatureLayer({
        url: "https://services7.arcgis.com/0A8SPugLkdU8g5QU/arcgis/rest/services/IBRA7Subregion/FeatureServer",
        outFields: ["*"],
        popupTemplate,
        opacity: this._opacity
      })

      this.featureLayer.on('click', event => {
        console.log(event);
      })

      Object.keys(this.maps).forEach(mapType => {
        let mapProperties: esri.MapProperties = {
          basemap: mapType
        };
        let map: esri.Map = new EsriMap(mapProperties);
        this.maps[mapType] = map;
      })

      // Set type for MapView constructor properties
      const mapViewProperties: esri.MapViewProperties = {
        container: this.mapViewEl.nativeElement,
        center: this._center,
        zoom: this._zoom,
        map: this.maps[this._currentMap]
      };
      
      this.mapView = new EsriMapView(mapViewProperties);
      this.mapView.map.add(this.featureLayer);
      // this.trackWidget = new Track({
      //   view: this.mapView
      // })

      // this.mapView.ui.add(this.trackWidget, 'top-left');
      // this.trackWidget.on('track', event => {
      //   console.log('tracking...');
      //   console.log(event);
      // })

      // this.trackWidget.on('track-error', event => {
      //   alert("Cannot track location. Please refresh.");
      //   console.log('Track error');
      //   console.log(event);
      // })

      this.featureLayer.on('layerview-create', event => {
        let layerView = event.layerView;
        layerView.watch('updating', val => {
          if (!val) {
            // All the resources in the MapView and the map have loaded. Now execute additional processes
            this.mapLoaded.emit(true);

            //Query features available for drawing in the layer view.
            //Returns Array<Graphic>. If !params, all features are returned.
            layerView.queryFeatures().then(results => { 
              this.addSideBar(results);
            })
          }
        })
      })

      this.getLocation();
    })
    .catch(err => {
      console.error(err);
    });
  } // ngOnInit


  locationError(error) {
    console.log(`location error: ${error.message}`);
    switch(error.code){
      case error.PERMISSION_DENIED: alert("Error: Location not provided");
        break;
      case error.POSITION_UNAVAILABLE: alert("Current location is not available");
        break;
      case error.TIMEOUT: alert("Timeout Error: Could not obtain location information");
        break;
      default: alert("unknown error");
        break;
    }
  }

  /*
      Geolocation
    */
  getLocation() {
    if(navigator.geolocation) {
      console.log("location.");
      //  Load position
      this.locationLoading = true;
      navigator.geolocation.getCurrentPosition(location => {
        console.log("location");
        
        let point = new this.Point(location.coords.longitude, location.coords.latitude);
        // let line = new this.SimpleLineSymbol(this.SimpleLineSymbol.STYLE_SOLID, new this.Color([210, 105, 30, 0.5]), 8);
        // let marker = new this.SimpleMarkerSymbol(this.SimpleMarkerSymbol.STYLE_CIRCLE, 12, line, new this.Color([210, 105, 30, 0.9]))
        // //add marker graphic here
        // let graphic = new this.Graphic(point, marker);
        
        let marker = {
          type: "simple-marker",
          color: [0, 0, 255],
          outline: {
            color: [0, 191, 255],
            width: 2
          }
        }

        let markerGraphic = new this.Graphic({
          geometry: point,
          symbol: marker
        })

        this.mapView.center = point;
        this.mapView.graphics.add(markerGraphic);

        /*
          Todo: Add loading message
        */

        // navigator.geolocation.watchPosition(location => {
        //   console.log("loc update");
        //   let point = new this.Point(location.coords.longitude, location.coords.latitude);
        //   this.mapView.center = point;
        // }, this.locationError);
      }, this.locationError, {timeout: 40000, maximumAge: 560000, enableHighAccuracy: false});
 
    }

  }

  addSideBar(results){
    let subregionListNode = document.getElementById("subregion_list");
    let fragment = document.createDocumentFragment();
    console.log(results[0].geometry);
    console.log(results[0].geometry.rings);
    results.forEach(result => {
      result.attributes.ZIP = "TODO";
    })
     

    let stubNearbyRegions = [
      {
        name: "Conondale Ranges",
        state: "QLD",
        zip: "TODO"
      },
      {
        name: "Moreton Basin",
        state: "QLD",
        zip: "TODO"
      },
      {
        name: "Coldcoast Lowlands",
        state: "QLD",
        zip: "TODO"
      },
      {
        name: "Scenic Rim",
        state: "QLD",
        zip: "TODO"
      },
      {
        name: "Woodenbong",
        state: "QLD",
        zip: "TODO"
      },
    ]

    
    stubNearbyRegions.forEach(subregion => {
      let li = document.createElement("li");
      li.classList.add("panel-result");
      li.tabIndex = 0;
      li.textContent = `${subregion.name} (${subregion.state})`;
      fragment.appendChild(li);
    })
    subregionListNode.innerHTML = "";
    subregionListNode.appendChild(fragment);


    subregionListNode.addEventListener('click', event => {
      let target = event.target;

    })
  }
}