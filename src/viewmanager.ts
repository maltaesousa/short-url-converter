import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import View from 'ol/View';

proj4.defs('EPSG:2056', '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs');
register(proj4);


/**
 * This view helps transforming zoom levels to resolutions.
 */
export class ViewManager {
    private static instance: ViewManager;
    private static olView: View;

    private constructor() {
        if (!ViewManager.olView) {
            const resolutions = (process.env.RESOLUTIONS).split(',').map(r => parseFloat(r));
            ViewManager.olView = new View({
                projection: 'EPSG:2056',
                resolutions: resolutions,
            });
        }
    }

    public static getInstance(): ViewManager {
        if (!ViewManager.instance) {
            ViewManager.instance = new ViewManager();
        }
        return ViewManager.instance;
    }

    public static getOlView(): View {
        if (!ViewManager.olView) {
            ViewManager.getInstance();
        }
        return ViewManager.olView;
    }
}