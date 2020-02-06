import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'unpFilter'
})
export class UnpFilterPipe implements PipeTransform {
  transform(unps, searchTerm: string) {
    if (!unps || !searchTerm) {
      return unps;
    }
    return  unps.filter(unp => unp.indexOf(searchTerm.toUpperCase()) !== -1);
  }
}
