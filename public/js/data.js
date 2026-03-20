// ─── App State ──────────────────────────────────────────────────────────────
const State = {
  volvo: {
    connected: false,
    vehicleName: '',
    vin: '',
    token: null,
    apiKey: null,
    trips: []
  },
  outlook: {
    connected: false,
    userName: '',
    token: null,
    events: []
  },
  analyzed: false,
  settings: {
    carType:      'company',
    rateWork:     0,
    ratePrivate:  0,
    taxPrivate:   3.5,
    electricRate: 9.5,
    privateRate:  2.5
  }
};

// ─── Demo data ───────────────────────────────────────────────────────────────
const DEMO_TRIPS = [
  { id:1,  date:"2026-03-16", startTime:"08:05", endTime:"08:42", start:"Vänersborg centrum",   end:"Volvo Cars Göteborg", km:91.4, minutes:37, fuelL:7.2, maxKmh:132, avgKmh:148, type:null },
  { id:2,  date:"2026-03-16", startTime:"17:15", endTime:"17:58", start:"Volvo Cars Göteborg",  end:"Vänersborg centrum",  km:91.8, minutes:43, fuelL:7.5, maxKmh:130, avgKmh:128, type:null },
  { id:3,  date:"2026-03-14", startTime:"09:10", endTime:"09:35", start:"Vänersborg centrum",   end:"Trollhättan",         km:22.1, minutes:25, fuelL:1.9, maxKmh:98,  avgKmh:53,  type:null },
  { id:4,  date:"2026-03-13", startTime:"12:00", endTime:"13:50", start:"Vänersborg centrum",   end:"Karlstad",            km:148.3,minutes:110,fuelL:11.4,maxKmh:134, avgKmh:81,  type:null },
  { id:5,  date:"2026-03-12", startTime:"07:48", endTime:"08:25", start:"Vänersborg centrum",   end:"Trollhättan",         km:21.8, minutes:37, fuelL:1.8, maxKmh:95,  avgKmh:35,  type:null },
  { id:6,  date:"2026-03-11", startTime:"19:05", endTime:"19:44", start:"Borås",                end:"Vänersborg centrum",  km:77.6, minutes:39, fuelL:6.2, maxKmh:126, avgKmh:119, type:null },
  { id:7,  date:"2026-03-10", startTime:"08:00", endTime:"08:38", start:"Vänersborg centrum",   end:"Volvo Cars Göteborg", km:92.0, minutes:38, fuelL:7.3, maxKmh:131, avgKmh:145, type:null },
  { id:8,  date:"2026-03-10", startTime:"16:50", endTime:"17:30", start:"Volvo Cars Göteborg",  end:"Vänersborg centrum",  km:91.2, minutes:40, fuelL:7.1, maxKmh:129, avgKmh:137, type:null },
  { id:9,  date:"2026-03-07", startTime:"10:30", endTime:"12:15", start:"Vänersborg centrum",   end:"Stockholm Arlanda",   km:386.4,minutes:105,fuelL:29.1,maxKmh:138, avgKmh:221, type:null },
  { id:10, date:"2026-03-06", startTime:"15:00", endTime:"15:20", start:"Vänersborg centrum",   end:"ICA Maxi",            km:8.2,  minutes:20, fuelL:0.7, maxKmh:72,  avgKmh:25,  type:null },
  { id:11, date:"2026-03-05", startTime:"08:10", endTime:"08:48", start:"Vänersborg centrum",   end:"Trollhättan",         km:22.4, minutes:38, fuelL:1.9, maxKmh:101, avgKmh:35,  type:null },
  { id:12, date:"2026-03-04", startTime:"09:00", endTime:"10:30", start:"Vänersborg centrum",   end:"Göteborg Ullevi",     km:88.5, minutes:90, fuelL:7.0, maxKmh:122, avgKmh:59,  type:null },
  { id:13, date:"2026-02-27", startTime:"08:05", endTime:"08:44", start:"Vänersborg centrum",   end:"Volvo Cars Göteborg", km:91.6, minutes:39, fuelL:7.3, maxKmh:130, avgKmh:141, type:null },
  { id:14, date:"2026-02-27", startTime:"17:05", endTime:"17:50", start:"Volvo Cars Göteborg",  end:"Vänersborg centrum",  km:91.9, minutes:45, fuelL:7.5, maxKmh:129, avgKmh:123, type:null },
  { id:15, date:"2026-02-25", startTime:"14:00", endTime:"14:28", start:"Vänersborg centrum",   end:"Lidl Västra",         km:6.8,  minutes:28, fuelL:0.6, maxKmh:68,  avgKmh:15,  type:null },
  { id:16, date:"2026-02-24", startTime:"08:00", endTime:"10:30", start:"Vänersborg centrum",   end:"Skövde",              km:132.1,minutes:150,fuelL:10.4,maxKmh:131, avgKmh:53,  type:null },
  { id:17, date:"2026-02-20", startTime:"07:55", endTime:"08:40", start:"Vänersborg centrum",   end:"Volvo Cars Göteborg", km:91.2, minutes:45, fuelL:7.2, maxKmh:128, avgKmh:122, type:null },
  { id:18, date:"2026-02-20", startTime:"17:00", endTime:"17:48", start:"Volvo Cars Göteborg",  end:"Vänersborg centrum",  km:91.5, minutes:48, fuelL:7.4, maxKmh:130, avgKmh:114, type:null },
];

const DEMO_EVENTS = [
  { id:1,  date:"2026-03-16", startTime:"09:00", endTime:"17:00", subject:"Möte Volvo HQ",          location:"Volvo Cars Göteborg", isOnline:false, isWork:true  },
  { id:2,  date:"2026-03-14", startTime:"10:00", endTime:"15:00", subject:"Kundmöte Trollhättan",   location:"Trollhättan",         isOnline:false, isWork:true  },
  { id:3,  date:"2026-03-13", startTime:"13:00", endTime:"16:00", subject:"Konferens Karlstad",     location:"Karlstad",            isOnline:false, isWork:true  },
  { id:4,  date:"2026-03-12", startTime:"08:30", endTime:"16:00", subject:"Workshop Trollhättan",   location:"Trollhättan",         isOnline:false, isWork:true  },
  { id:5,  date:"2026-03-11", startTime:"20:00", endTime:"22:00", subject:"Middagsbjudning",        location:"Borås",               isOnline:false, isWork:false },
  { id:6,  date:"2026-03-10", startTime:"09:00", endTime:"17:00", subject:"Produktdemo Göteborg",   location:"Volvo Cars Göteborg", isOnline:false, isWork:true  },
  { id:7,  date:"2026-03-07", startTime:"13:00", endTime:"17:00", subject:"Mässa Stockholm",        location:"Stockholm Arlanda",   isOnline:false, isWork:true  },
  { id:8,  date:"2026-03-06", startTime:"08:00", endTime:"09:00", subject:"Frukostmöte Teams",      location:"Teams",               isOnline:true,  isWork:true  },
  { id:9,  date:"2026-03-05", startTime:"09:00", endTime:"15:00", subject:"Leverantörsmöte",        location:"Trollhättan",         isOnline:false, isWork:true  },
  { id:10, date:"2026-03-04", startTime:"10:00", endTime:"12:00", subject:"Fotboll med familjen",   location:"Göteborg",            isOnline:false, isWork:false },
  { id:11, date:"2026-02-27", startTime:"09:00", endTime:"17:00", subject:"Kvartalsmöte",           location:"Volvo Cars Göteborg", isOnline:false, isWork:true  },
  { id:12, date:"2026-02-24", startTime:"09:00", endTime:"16:00", subject:"Utbildning Skövde",      location:"Skövde",              isOnline:false, isWork:true  },
  { id:13, date:"2026-02-20", startTime:"09:00", endTime:"17:00", subject:"Produktutveckling HQ",   location:"Volvo Cars Göteborg", isOnline:false, isWork:true  },
];