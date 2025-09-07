let SpisakNekretnina = function () {
    // privatni atributi modula
    let listaNekretnina = [];
    let listaKorisnika = [];

    // inicijalizacija
    let init = function (nekretnine, korisnici) {
        listaNekretnina = nekretnine;
        listaKorisnika = korisnici;
    }

    let filtrirajNekretnine = function (kriterij) {
        return listaNekretnina.filter(nekretnina => {
            if (kriterij.tip_nekretnine && nekretnina.tip_nekretnine !== kriterij.tip_nekretnine)
                return false;
            if (kriterij.min_kvadratura && nekretnina.kvadratura < kriterij.min_kvadratura)
                return false;
            if (kriterij.max_kvadratura && nekretnina.kvadratura > kriterij.max_kvadratura)
                return false;
            if (kriterij.min_cijena && nekretnina.cijena < kriterij.min_cijena)
                return false;
            if (kriterij.max_cijena && nekretnina.cijena > kriterij.max_cijena)
                return false;
            return true;
        });
    }

    let ucitajDetaljeNekretnine = function (id) {
        return listaNekretnina.find(nekretnina => nekretnina.id === id) || null;
    }

    return {
        init,
        filtrirajNekretnine,
        ucitajDetaljeNekretnine,
        // dodajemo getter za listu nekretnina da StatistikaNekretnina može koristiti
        getListaNekretnina: () => listaNekretnina,
        getListaKorisnika: () => listaKorisnika
    }
};

export default SpisakNekretnina;
