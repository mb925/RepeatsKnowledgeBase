import {Log} from '../log.model';

export abstract class QueryExtractor {

  url: string;

  constructor(url: string) {
    this.url = url;
  }

  public async query(params: string) {

    if (params === undefined || typeof params !== 'string') {
      Log.w(1, 'wrong type for input id.');
      return {};
    }

    let web;
    let res;
    try {
      web = await fetch(`${this.url}${params}`);
      res = await web.json();
    } catch (e) {
      Log.w(1, `${e.message}`);
      return {};
    }

    if (typeof res !== 'object') {
      Log.w(1, 'wrong response type from website.');
      return {};
    }

    return res;
  }
}
