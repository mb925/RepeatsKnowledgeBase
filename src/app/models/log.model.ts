export class Log {

  static log = 0; // raise this value to see logs : 0,1,2,3

  static s(lvl: number) {
    Log.log = lvl;
  }

  static w(lvl: number, e: string) {
    if (lvl <= Log.log) {
      console.warn(e);
    }
  }

}
