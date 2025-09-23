// inicijalizacija modula
let statistika = StatistikaNekretnina();
statistika.init(listaNekretnina, listaKorisnika);

// dodavanje event listenera na dugme
document.getElementById("iscrtaj").addEventListener("click", iscrtajHistogram);

function iscrtajHistogram() {
  // čitanje input vrijednosti
  let pocetnaGodina = parseInt(document.getElementById("period-pocetak").value);
  let krajnjaGodina = parseInt(document.getElementById("period-kraj").value);
  let minCijena = parseInt(document.getElementById("cijena-pocetak").value);
  let maxCijena = parseInt(document.getElementById("cijena-kraj").value);

  // generisanje perioda po 5 godina
  let periodi = [];
  let korakGodina = 5;
  for (let g = pocetnaGodina; g <= krajnjaGodina; g += korakGodina) {
    periodi.push({ od: g, do: Math.min(g + korakGodina - 1, krajnjaGodina) });
  }

  // generisanje raspona cijena po 100k
  let rasponiCijena = [];
  let korakCijena = 100000;
  for (let c = minCijena; c <= maxCijena; c += korakCijena) {
    rasponiCijena.push({ od: c, do: Math.min(c + korakCijena - 1, maxCijena) });
  }

  // poziv histogramCijena iz StatistikaNekretnina
  let podaci = statistika.histogramCijena(periodi, rasponiCijena);

  // čišćenje starog sadržaja
  let container = document.getElementById("chartContainer");
  container.innerHTML = "";

  // iscrtavanje po periodima
  periodi.forEach((p, i) => {
    let canvas = document.createElement("canvas");
    canvas.id = "chart-" + i;
    canvas.width = 400; // fiksna širina
    canvas.height = 300; // fiksna visina
    container.appendChild(canvas);

    // filtriraj podatke za trenutni period
    let dataPerioda = podaci.filter((el) => el.indeksPerioda === i);

    // x osi - svi rasponi cijena
    let labels = rasponiCijena.map((r) => r.od + "-" + r.do);

    // y osi - broj nekretnina u svakom rasponu
    let values = dataPerioda.map((el) => el.brojNekretnina);

    new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: `Period ${p.od}-${p.do}`,
            data: values,
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: false, // fiksna veličina, ne raste
        plugins: {
          legend: { display: true },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
      },
    });
  });
}
