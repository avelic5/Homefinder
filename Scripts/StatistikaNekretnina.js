import SpisakNekretnina from "./SpisakNekretnina.js";

let StatistikaNekretnina = function () {
    let spisak = SpisakNekretnina();

    let init = function (listaNekretnina, listaKorisnika) {
        spisak.init(listaNekretnina, listaKorisnika);
    };

    let histogramCijena = function (periodi, rasponiCijena) {
        let rezultat = [];

        periodi.forEach((p, i) => {
            let nekretnineUPeriodu = spisak
                .filtrirajNekretnine({}) // sve nekretnine
                .filter(n => n.godinaIzgradnje >= p.od && n.godinaIzgradnje <= p.do);

            rasponiCijena.forEach((r, j) => {
                let count = nekretnineUPeriodu.filter(
                    n => n.cijena >= r.od && n.cijena <= r.do
                ).length;

                rezultat.push({
                    indeksPerioda: i,
                    indeksRasponaCijena: j,
                    brojNekretnina: count
                });
            });
        });

        return rezultat;
    };

    return {
        init,
        histogramCijena
    };
};

export default StatistikaNekretnina;
