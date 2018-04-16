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
    satellite: null,
    dark_gray: null
  };

  private mapView: esri.MapView;
  private _currentMap = 'dark_gray';
  private featureLayer
  private trackWidget;
  //pointers to Esri classes
  private Point;
  private Circle;
  private Graphic;
  private SimpleFillSymbol;

  subregions = 0;

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
  @Input() _outlineChanged: Subject<any>;

  @Output() mapLoaded = new EventEmitter<boolean>();

  // this is needed to be able to create the MapView at the DOM element in this component
  @ViewChild('mapViewNode') private mapViewEl: ElementRef;

  constructor() {
    this.handlePointerEvent = this.handlePointerEvent.bind(this);
  }

  public ngOnInit() {

    this._mapSelected.subscribe(mapType => {
      this.mapView.map = this.maps[mapType];
      this.mapView.map.add(this.featureLayer);
    })
    this._opacityChanged.subscribe(opacity => {
      this.featureLayer.opacity = opacity;
    })

    this._outlineChanged.subscribe(outline => {
      console.log(outline);
      this.featureLayer.renderer.symbol.outline.color = outline.color;
    })

    loadModules([
      'esri/Map',
      'esri/views/MapView',
      'esri/layers/FeatureLayer',
      'esri/geometry/Point',
      'esri/widgets/Track',
      'esri/Graphic',
      'esri/widgets/Compass',
      'esri/widgets/Search',
      'esri/symbols/SimpleFillSymbol'
    ])
    .then(([EsriMap, EsriMapView, FeatureLayer, Point, Track, Graphic, Compass, Search, SimpleFillSymbol]) => {
      
      this.Point = Point;
      this.Graphic = Graphic;
      this.SimpleFillSymbol = SimpleFillSymbol;

      let popupTemplate = {
        title: "Subregion: {IBRA_SUB_N}",
        content: `
        <h5>Details of this subregion:</h5>
        <p><b>State</b>: {STATE}</p>
        <i>Todo: Find more information</i>
        `
      };

      this.featureLayer = new FeatureLayer({
        url: "https://services7.arcgis.com/0A8SPugLkdU8g5QU/arcgis/rest/services/IBRA7Subregion/FeatureServer",
        outFields: ["*"],
        popupTemplate,
        opacity: this._opacity,
        minScale: 0
      })

      Object.keys(this.maps).forEach(mapType => {
        let mapProperties: esri.MapProperties = {
          basemap: mapType == 'dark_gray' ? 'dark-gray': mapType
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
      
      //  Widgets
      let compass = new Compass({
        view: this.mapView
      })

      let search = new Search({
        view: this.mapView
      })
      this.mapView.ui.add(search, 'bottom-left');
      this.mapView.ui.add(compass, 'bottom-left');
      
      this.mapView.on('pointer-move', this.handlePointerEvent)
      this.mapView.on('pointer-down', this.handlePointerEvent)

      this.featureLayer.on('layerview-create', event => {
        let layerView = event.layerView;
        layerView.watch('updating', val => {
          if (!val) {
            // All the resources in the MapView and the map have loaded. Now execute additional processes
            this.mapLoaded.emit(true);
            console.log(JSON.stringify(this.featureLayer.renderer))
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
    switch(error.code){
      case error.PERMISSION_DENIED: alert("Error: Location permission denied");
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
      //  Load position
      navigator.geolocation.getCurrentPosition(location => {
        
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

      }, this.locationError, {timeout: 40000, maximumAge: 560000, enableHighAccuracy: false});
 
    }

  }

  addSideBar(results){
    let subregionListNode = document.getElementById("subregion_list");
    let fragment = document.createDocumentFragment();
 
    this.subregions = results.length;
    for(let i = 0; i < 7; i++){
      let result = results[i];
      let li = document.createElement("li");
      li.classList.add("panel-result");
      li.tabIndex = 0;
      li.textContent = `${result.attributes.IBRA_SUB_N} (${result.attributes.STATE})`;
      li.setAttribute('data-result-id', i.toString());
      fragment.appendChild(li);
    }
    
    subregionListNode.innerHTML = "";
    subregionListNode.appendChild(fragment);


    subregionListNode.addEventListener('click', event => {
      let target = <HTMLLIElement>event.target;
      let resultId = target.getAttribute('data-result-id')
      let result = resultId && results && results[resultId];
      
      if (result) {
        this.mapView.popup.open({
          features: [result],
          location: result.geometry.centroid
        })

        this.mapView.center = result.geometry.centroid

        let subregionDetail = document.getElementById('subregion-detail');
        subregionDetail.innerHTML = "";
        subregionDetail.innerHTML = `
          <ul style="list-style:none;">
            <li>Name: ${result.attributes.IBRA_SUB_N}</li>
            <li>Region Name: ${result.attributes.IBRA_REG_N}</li>
            <li>State: ${result.attributes.STATE}</li>
          </ul>
        `;
      }
    })
  }

  handlePointerEvent(event) {

    this.mapView.hitTest(event).then(response => {
      if (response.results.length) {
        let graphic = response.results[0].graphic; //this is assuming that only 1 layer is below the cursor.
        let attributes = graphic.attributes;

        let renderer = {
          type: 'unique-value',
          field: 'IBRA_SUB_N',
          defaultSymbol: this.featureLayer.renderer.symbol || this.featureLayer.renderer.defaultSymbol,
          uniqueValueInfos: [{
            value: attributes.IBRA_SUB_N,
            symbol: {
              type: 'simple-fill',
              color: [255, 0, 0, 0.9],
              outline: {
                color: [255,255,255,255], 
                width: 0.75,
              }
            }
          }]
        }

        this.featureLayer.renderer = renderer;
        

        let subregionDetail = document.getElementById('subregion-detail');
        subregionDetail.innerHTML = "";
        subregionDetail.innerHTML = `
          <ul style="list-style:none;">
            <li>Name: ${attributes.IBRA_SUB_N}</li>
            <li>Region Name: ${attributes.IBRA_REG_N}</li>
            <li>State: ${attributes.STATE}</li>
          </ul>
        `;
      }
    })
  }
}