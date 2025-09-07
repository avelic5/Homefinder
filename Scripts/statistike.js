import StatistikaNekretnina from "./StatistikaNekretnina.js";
import { listaNekretnina, listaKorisnika } from "./podaci.js"; // tvoji realni podaci

function iscrtajHistogram() {
    let periodOd = parseInt(document.getElementById("period-pocetak").value);
    let periodDo = parseInt(document.getElementById("period-kraj").value);
    let cijenaOd = parseInt(document.getElementById("cijena-pocetak").value);
    let cijenaDo = parseInt(document.getElementById("cijena-kraj").value);

    let periodi = [
        { od: periodOd, do: Math.floor((periodOd + periodDo) / 2) },
        { od: Math.floor((periodOd + periodDo) / 2) + 1, do: periodDo }
    ];
    let rasponi = [
        { od: cijenaOd, do: Math.floor((cijenaOd + cijenaDo) / 2) },
        { od: Math.floor((cijenaOd + cijenaDo) / 2) + 1, do: cijenaDo }
    ];

    let statistika = StatistikaNekretnina();
    statistika.init(listaNekretnina, listaKorisnika);

    let rezultat = statistika.histogramCijena(periodi, rasponi);

    // očisti prije crtanja
    document.getElementById("chartContainer").innerHTML = "";

    periodi.forEach((p, i) => {
        let canvas = document.createElement("canvas");
        document.getElementById("chartContainer").appendChild(canvas);

        let dataZaPeriod = rezultat.filter(r => r.indeksPerioda === i);

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: dataZaPeriod.map((r, j) => `Cijena ${j + 1}`),
                datasets: [{
                    label: `Period ${p.od}-${p.do}`,
                    data: dataZaPeriod.map(r => r.brojNekretnina),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Histogram nekretnina ${p.od}-${p.do}`
                    }
                }
            }
        });
    });
}

document.getElementById("iscrtaj").addEventListener("click", iscrtajHistogram);
