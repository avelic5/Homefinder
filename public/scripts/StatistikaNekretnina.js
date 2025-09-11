 var StatistikaNekretnina = function () {
    // privatni atributi
    let listaNekretnina = [];
    let listaKorisnika = [];
    let spisakNekretnina = SpisakNekretnina();

    // metode
    let init = function (nekretnine, korisnici) {
        listaNekretnina = nekretnine;
        listaKorisnika = korisnici;
        spisakNekretnina.init(nekretnine, korisnici);
    }

    // prosječna kvadratura filtriranih nekretnina po kriteriju
    let prosjecnaKvadratura = function (kriterij) {
        let filtrirane = spisakNekretnina.filtrirajNekretnine(kriterij);
        if (filtrirane.length === 0) return 0;
        let suma = filtrirane.reduce((zbir, n) => zbir + n.kvadratura, 0);
        return suma / filtrirane.length;
    }

    // outlier – nekretnina sa najvećim odstupanjem od prosjeka
    let outlier = function (kriterij, nazivSvojstva) {
        let filtrirane = spisakNekretnina.filtrirajNekretnine(kriterij);
        if (filtrirane.length === 0) return null;

        let prosjek = filtrirane.reduce((suma, n) => suma + n[nazivSvojstva], 0) / filtrirane.length;

        let najOutlier = filtrirane[0];
        let maxOdstupanje = Math.abs(filtrirane[0][nazivSvojstva] - prosjek);

        filtrirane.forEach(n => {
            let odstupanje = Math.abs(n[nazivSvojstva] - prosjek);
            if (odstupanje > maxOdstupanje) {
                maxOdstupanje = odstupanje;
                najOutlier = n;
            }
        });

        return najOutlier;
    }

    // mojeNekretnine – sve gdje korisnik ima bar jedan upit
    let mojeNekretnine = function (korisnik) {
        let rezultat = listaNekretnina.filter(n =>
            n.upiti.some(upit => upit.korisnik_id === korisnik.id)
        );

        // sortiranje po broju upita
        rezultat.sort((a, b) => b.upiti.length - a.upiti.length);
        return rezultat;
    }

    // histogramCijena – grupisanje po periodima i rasponima cijena
    let histogramCijena = function (periodi, rasponiCijena) {
        let rezultat = [];

        periodi.forEach((period, i) => {
            // nekretnine objavljene u periodu
            let uPeriodu = listaNekretnina.filter(n => {
                let godina = parseInt(n.datum_objave.split(".")[2]);
                return godina >= period.od && godina <= period.do;
            });

            rasponiCijena.forEach((raspon, j) => {
                let uRasponu = uPeriodu.filter(n =>
                    n.cijena >= raspon.od && n.cijena <= raspon.do
                );

                rezultat.push({
                    indeksPerioda: i,
                    indeksRasponaCijena: j,
                    brojNekretnina: uRasponu.length
                });
            });
        });

        return rezultat;
    }

    // vraćamo objekat sa metodama (kao kod SpisakNekretnina)
    return {
        init: init,
        prosjecnaKvadratura: prosjecnaKvadratura,
        outlier: outlier,
        mojeNekretnine: mojeNekretnine,
        histogramCijena: histogramCijena
    }
};
