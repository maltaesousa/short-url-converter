import { State } from './state';
import { ExtendedState } from './types';
import * as LZString from 'lz-string';

export class GeoGirafeSerializer {
  constructor() { }

  async serializeToUrl(state: State, baseUrl: string): Promise<string> {

    let extendedState: ExtendedState = {} as ExtendedState;
    if (state.features) {
      extendedState.drawing = JSON.stringify(state.features);
    }
    delete state.features;
    const serializedState = {} as Record<string, any>;
    const keys = Object.keys(state)
    for (const key of keys) {
      serializedState[key] = JSON.stringify(state[key as keyof State]);
    }

    const stateJson = JSON.stringify(serializedState);
    const extendedStateJson = JSON.stringify(extendedState);

    const compressedState = LZString.compressToBase64(stateJson);
    const compressedExtendedState = LZString.compressToBase64(extendedStateJson);

    const fullCompressed = LZString.compressToBase64(`${compressedState}-${compressedExtendedState}`);

    return `${baseUrl}#${fullCompressed}`;
  }
}
