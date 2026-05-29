import { buildSearchQuery } from '@/src/be/modules/search/movie-search-service'
console.log(JSON.stringify(buildSearchQuery('tu chien tren khong', {}), null, 2))
