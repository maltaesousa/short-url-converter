import { State, ExtendedState } from './types';
import * as LZString from 'lz-string';

export class GeoGirafeSerializer {
  constructor() {}

  async serializeToUrl(state: State, extendedState: ExtendedState, baseUrl: string): Promise<string> {

    const serializedState = {} as Record<string, any>;
    const keys = Object.keys(state)
    for (const key of keys) {
      serializedState[key] = JSON.stringify(state[key as keyof State]);
    }

    const stateJson = JSON.stringify(serializedState);
    const extendedStateJson = this.serializeExtendedState(extendedState);

    const compressedState = LZString.compressToBase64(stateJson);
    const compressedExtendedState = LZString.compressToBase64(extendedStateJson);

    const fullCompressed = LZString.compressToBase64(`${compressedState}-${compressedExtendedState}`);

    return `${baseUrl}#${fullCompressed}`;
  }

  private serializeExtendedState(extendedState: ExtendedState): string {
    if (!extendedState || Object.keys(extendedState).length === 0) {
      return JSON.stringify({});
    }
    return JSON.stringify(extendedState);
  }
}
