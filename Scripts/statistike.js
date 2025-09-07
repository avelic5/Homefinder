import StatistikaNekretnina from "./StatistikaNekretnina.js";

// Kreiramo instancu statistike
const statistika = StatistikaNekretnina();

// --------------------------
// Primjer inicijalnih podataka (izvuci iz HTML-a ili definiraj statički)
// Ovo su primjer objekti koji odgovaraju strukturi koju koristi SpisakNekretnina
// Moraju imati: tip_nekretnine, kvadratura, cijena, godinaObjave, upiti
// Upiti su niz objekata sa svojstvom korisnik
const nekretnine = [
    { id: 1, tip_nekretnine: "stan", kvadratura: 80, cijena: 100000, godinaObjave: 2005, upiti: [{ korisnik: "user1" }] },
    { id: 2, tip_nekretnine: "kuca", kvadratura: 150, cijena: 200000, godinaObjave: 2015, upiti: [{ korisnik: "user2" }] },
    { id: 3, tip_nekretnine: "pp", kvadratura: 200, cijena: 300000, godinaObjave: 2020, upiti: [] }
];

// Inicijaliziramo statistiku
statistika.init(nekretnine, []);

// Funkcija koja se poziva klikom na dugme
function iscrtajHistogram() {
    const periodOd = parseInt(document.getElementById("period-pocetak").value);
    const periodDo = parseInt(document.getElementById("period-kraj").value);
    const cijenaOd = parseInt(document.getElementById("cijena-pocetak").value);
    const cijenaDo = parseInt(document.getElementById("cijena-kraj").value);

    // Kreiramo periode i raspon cijena
    const periodi = [{ od: periodOd, do: periodDo }];
    const rasponiCijena = [{ od: cijenaOd, do: cijenaDo }];

    // Dohvatimo histogram
    const podaci = statistika.histogramCijena(periodi, rasponiCijena);

    // Očistimo container za chart
    const container = document.getElementById("chartContainer");
    container.innerHTML = "";

    // Kreiramo canvas element za Chart.js
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    // Transformacija podataka za Chart.js
    const xOsa = podaci.map(d => `Period ${d.indeksPerioda} / Cijena ${d.indeksRasponaCijena}`);
    const yOsa = podaci.map(d => d.brojNekretnina);

    // Iscrtavanje Chart.js bar charta
    new Chart(canvas.getContext("2d"), {
        type: 'bar',
        data: {
            labels: xOsa,
            datasets: [{
                label: 'Broj nekretnina',
                data: yOsa,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Histogram nekretnina po periodu i cijeni' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Dodavanje event listenera
document.getElementById("iscrtaj").addEventListener("click", iscrtajHistogram);
