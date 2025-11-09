const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs").promises; // Using asynchronus API for file read and write
const bcrypt = require("bcrypt");
const { read } = require("fs");
const app = express();
const PORT = 3000;
const methodOverride = require('method-override');
const { Pool } = require("pg");
const env = require("dotenv");
env.config();

const pool = new Pool({
  user: process.env.USER,       
  host: process.env.HOST,
  database: process.env.DATABASE,  
  password: process.env.PASSWORD,
  port: 5432,
  ssl: true
});



app.use(
  session({
    secret: "tajna sifra",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
    rolling:true
  })
);

app.use(express.static(__dirname + "/public"));

// Enable JSON parsing without body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    return req.body._method;
  }
}));



/* ---------------- SERVING HTML -------------------- */

// Async function for serving html files
async function serveHTMLFile(req, res, fileName) {
  const htmlPath = path.join(__dirname, "public/html", fileName);
  try {
    const content = await fs.readFile(htmlPath, "utf-8");
    res.send(content);
  } catch (error) {
    console.error("Error serving HTML file:", error);
   res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
}

// Array of HTML files and their routes
const routes = [
  { route: "/nekretnine.html", file: "nekretnine.html" },
  { route: "/detalji.html", file: "detalji.html" },
  { route: "/meni.html", file: "meni.html" },
  { route: "/prijava.html", file: "prijava.html" },
  { route: "/profil.html", file: "profil.html" },
  // Practical for adding more .html files as the project grows
];

// Loop through the array so HTML can be served
routes.forEach(({ route, file }) => {
  app.get(route, async (req, res) => {
    await serveHTMLFile(req, res, file);
  });
});

/* ----------- SERVING OTHER ROUTES --------------- */

// Async function for reading json data from data folder
async function readTable(tableName) {
  try {
    const res = await pool.query(`SELECT * FROM ${tableName}`);
    return res.rows; // vraća niz objekata
  } catch (error) {
    console.error(`Greška pri čitanju tabele ${tableName}:`, error);
    throw new Error(`Greška pri čitanju tabele ${tableName}`);
  }
}

// Spremanje/promenjena podataka u tabelu
// data treba biti objekat sa ključem 'id' za UPDATE ili bez id za INSERT
async function saveTable(tableName, data) {
  try {
    if (data.id) {
      // UPDATE
      const columns = Object.keys(data).filter(k => k !== "id");
      const setString = columns.map((col, i) => `${col}=$${i+1}`).join(", ");
      const values = columns.map(col => data[col]);
      values.push(data.id); // za WHERE id=$n
      await pool.query(
        `UPDATE ${tableName} SET ${setString} WHERE id=$${values.length}`,
        values
      );
    } else {
      // INSERT
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, i) => `$${i+1}`).join(", ");
      await pool.query(
        `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`,
        values
      );
    }
  } catch (error) {
    console.error(`Greška pri spremanju u tabelu ${tableName}:`, error);
    throw new Error(`Greška pri čitanju tabele ${tableName}`);
  }
}
/*
Checks if the user exists and if the password is correct based on korisnici.json data. 
If the data is correct, the username is saved in the session and a success message is sent.
*/

app.get("/", (req, res) => {
  if (!req.session.username) {
    res.render("prijava.ejs");
  } else {
    res.render("nekretnine.ejs", { aktivnaStranica: "nekretnine" });
  }
});
// Detalji nekretnine
app.get("/detalji/:id", async (req, res) => {
  try {
    // Učitaj sve nekretnine iz baze
    const nekretnine = await readTable("nekretnine");

    // Pronađi nekretninu po ID-u
    const nekretnina = nekretnine.find(el => el.id == req.params.id);

    if (!nekretnina) {
      return res.status(404).render("error.ejs",{message:"Nekretnina nije pronadjena",vratigdje:"nekretnine",path:"/nekretnine"});
    }

    // Dodaj aktivnu stranicu
    nekretnina.aktivnaStranica = "nekretnine";

    let upiti = await readTable("upiti");
    upiti = upiti.filter(el => el.nekretnina_id==nekretnina.id);
    nekretnina.upiti=upiti;
    res.render("detalji.ejs", nekretnina);
  } catch (error) {
    console.error("Greška pri učitavanju detalja nekretnine:", error);
   res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// Signup GET
app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

// Signup POST
app.post("/signup", async (req, res) => {
  const { ime, prezime, username, password } = req.body;

  if (!username || !ime || !prezime || !password) {
    return res.send("Sva polja su obavezna!");
  }

  try {
    // Provjeri da li korisnik sa tim username-om već postoji
    const {rows:existingUser} = await pool.query("SELECT username FROM korisnici where username=$1",[username]);
    if (existingUser.length!=0) {
     return res.status(500).render("error.ejs", { message: "Korisnik sa tim username već postoji", vratigdje: "SignUp", path: "/signup" });
    }

    // Hashiraj lozinku
    const hashedPassword = await bcrypt.hash(password, 10);

    // Napravi novi korisnički objekat
    const newUser = {
      ime,
      prezime,
      username,
      password: hashedPassword
    };

    // Spremi korisnika u bazu
    await pool.query("INSERT INTO korisnici(ime,prezime,username,password) VALUES ($1,$2,$3,$4)",[ime,prezime,username,hashedPassword]);

    // Postavi sesiju
    req.session.username = username;

    res.redirect("/");
  } catch (error) {
    console.error("Greška pri registraciji korisnika:", error);
    res.status(500).render("error.ejs", { message: "Internal Server error", vratigdje: "Login", path: "/" });
  }
});


// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Učitaj sve korisnike iz baze
    const korisnici = await readTable("korisnici");
    const korisnik = korisnici.find(u => u.username === username);

    if (!korisnik) {
      return res.json({ poruka: "Neuspješna prijava" });
      
    }
    
    // Provjera da li je korisnik blokiran
    if (req.session.lockUntil && Date.now() < req.session.lockUntil) {
      console.log("Korisnik je još uvijek blokiran!");
      // Ovdje možeš dodati zapis u log fajl ako želiš
      return res.status(429).json({
        greska: "Previse neuspjesnih pokusaja. Pokusajte ponovo kasnije.",
      });
    }

    const isPasswordMatched = await bcrypt.compare(password, korisnik.password);

    if (isPasswordMatched) {
      req.session.username = korisnik.username;
      req.session.broj_pokusaja_login = 0;
      // Opcionalno: log uspješnog logina
      return res.status(200).json({message:"Uspješna prijava"});
    } else {
      req.session.broj_pokusaja_login = (req.session.broj_pokusaja_login || 0) + 1;
      // Opcionalno: log neuspjelog logina

      if (req.session.broj_pokusaja_login === 3) {
        req.session.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minuta blokade
        req.session.broj_pokusaja_login = 0;
      }

      return res.json({ poruka: "Neuspješna prijava" });
    }
  } catch (error) {
    console.error("Greška pri login-u:", error);
     res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// MAKE UPIT
app.get("/makeupit/:id", async (req, res) => {
  try {
    const nekretnine = await readTable("nekretnine");
    const nekretnina = nekretnine.find(el => el.id == req.params.id);

    if (!nekretnina) {
      return res.status(404).send("Nekretnina nije pronađena");
    }

    res.render("makeupit.ejs", {
      id: nekretnina.id,
      naziv: nekretnina.naziv,
      aktivnaStranica: ""
    });
  } catch (error) {
    console.error("Greška pri učitavanju nekretnine za upit:", error);
     res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// LOGOUT
app.get("/logout", (req, res) => {
  if (!req.session.username) {
     res.status(401).render("error.ejs",{message:"Neautorizovan pristup",vratigdje:"Login",path:"/"});
  }

  req.session.destroy(err => {
    if (err) {
      console.error("Greška pri logout-u:", err);
      return res.status(500).json({ greska: "Internal Server Error" });
    }
    res.redirect("/");
  });
});

/*
Returns currently logged user data. First takes the username from the session and grabs other data
from the .json file.
*/

//profil.ejs
// PROFIL KORISNIKA
app.get("/korisnik", async (req, res) => {
  if (!req.session.username) {
   res.status(401).render("error.ejs",{message:"Neautorizovan pristup",vratigdje:"Login",path:"/"});
  }

  try {
    // Učitaj korisnike iz baze
    const users = await readTable("korisnici");

    // Pronađi trenutno prijavljenog korisnika
    const user = users.find(u => u.username === req.session.username);

    if (!user) {
      return res.status(404).json({ greska: "Korisnik nije pronađen" });
    }

    const userData = {
      id: user.id,
      ime: user.ime,
      prezime: user.prezime,
      username: user.username,
      password: user.password // po želji možeš izbaciti iz rendera radi sigurnosti
    };

    res.render("profil.ejs", { user: userData, aktivnaStranica: "korisnik" });
  } catch (error) {
    console.error("Greška pri učitavanju korisnika:", error);
    res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// POST UPIT
app.post("/upit/:id", async (req, res) => {
  if (!req.session.username) {
    res.status(401).render("error.ejs",{message:"Neautorizovan pristup",vratigdje:"Login",path:"/"});
  }

  const { tekst_upita } = req.body;

  try {
    // Učitaj korisnike i nekretnine iz baze
    const users = await readTable("korisnici");
    const nekretnine = await readTable("nekretnine");
    let upiti = await readTable("upiti");

    // Pronađi prijavljenog korisnika
    const loggedInUser = users.find(u => u.username === req.session.username);
    if (!loggedInUser) {
      return res.status(404).json({ greska: "Korisnik nije pronađen" });
    }

    // Pronađi nekretninu
    const nekretnina = nekretnine.find(n => n.id == req.params.id);
    if (!nekretnina) {
      return res.status(400).json({ greska: `Nekretnina sa id-em ${req.params.id} ne postoji` });
    }

    // Inicijaliziraj upite ako ne postoji
    nekretnina.upiti = nekretnina.upiti || [];

   

    // Dodaj novi upit
    nekretnina.upiti.push({
      korisnik_id: loggedInUser.id,
      tekst_upita
    });

    // Spremi promjene u bazu
    await pool.query("INSERT INTO upiti(nekretnina_id,korisnik_id,tekst_upita) VALUES ($1,$2,$3)",[nekretnina.id,loggedInUser.id,tekst_upita]);

    // Render detalja nekretnine
    nekretnina.aktivnaStranica = "";
    res.redirect(`/detalji/${nekretnina.id}`);
  } catch (error) {
    console.error("Greška pri dodavanju upita:", error);
     res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});
    
// GET MOJI UPITI
app.get("/upiti/moji", async (req, res) => {
  if (!req.session.username) {
    res.status(401).render("error.ejs",{message:"Neautorizovan pristup",vratigdje:"Login",path:"/"});
  }

  try {
    const users = await readTable("korisnici");
    const nekretnine = await readTable("nekretnine");

    const loggedInUser = users.find(u => u.username === req.session.username);
    if (!loggedInUser) return res.status(401).render("error.ejs",{message:"Neautorizovan pristup",vratigdje:"Login",path:"/"});

    const mojiUpiti = [];
    const {rows} = await pool.query("SELECT nekretnina_id, tekst_upita FROM upiti WHERE korisnik_id=$1",[loggedInUser.id]);


    res.render("mojiupiti.ejs", { mojiUpiti:rows, aktivnaStranica: "" });
  } catch (error) {
    console.error("Greška pri učitavanju mojih upita:", error);
     res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// GET AZURIRAJ KORISNIK
app.get("/azurirajkorisnik", async (req, res) => {
  if (!req.session.username) {
    return res.status(401).render("error.ejs",{message:"Neautorizovan pristup",vratigdje:"Login",path:"/"});
  }

  try {
    const users = await readTable("korisnici");
    const user = users.find(u => u.username === req.session.username);

    if (!user) return res.status(404).json({ greska: "Korisnik nije pronađen" });

    res.render("azurirajkorisnik.ejs", { aktivnaStranica: "", user });
  } catch (error) {
    console.error("Greška pri učitavanju korisnika za azuriranje:", error);
    res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// PUT KORISNIK
app.put("/korisnik", async (req, res) => {
  if (!req.session.username) {
    res.status(401).render("error.ejs",{message:"Neautorizovan pristup",vratigdje:"Login",path:"/"});
  }
  
  const { ime, prezime, username, password } = req.body;
 const {rows:existingUser} = await pool.query("SELECT username FROM korisnici where username=$1",[username]);
    if (existingUser.length!=0&&existingUser[0].username!=username&&existingUser.length!=1) {
     return res.status(500).render("error.ejs", { message: "Korisnik sa tim username već postoji", vratigdje: "ažuriranje", path: "/azurirajkorisnik" });
    }
  try {
    const users = await readTable("korisnici");
    const loggedInUser = users.find(u => u.username === req.session.username);

    if (!loggedInUser) {
      res.status(401).render("error.ejs",{message:"Neautorizovan pristup",vratigdje:"Login",path:"/"});
    }

    // Ažuriranje podataka
    if (ime) loggedInUser.ime = ime;
    if (prezime) loggedInUser.prezime = prezime;
    if (username) loggedInUser.username = username;
    if (password) {
      loggedInUser.password = await bcrypt.hash(password, 10);
    }

    // Spremi u bazu
    await pool.query("UPDATE korisnici SET ime=$1, prezime=$2, username=$3, password=$4 WHERE id=$5",[ime,prezime,username,password,loggedInUser.id]);

    res.render("profil.ejs", { aktivnaStranica: "korisnik", user: loggedInUser });
  } catch (error) {
    console.error("Greška pri ažuriranju korisnika:", error);
     res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

/*
Returns all properties from the file.
*/
// GET /nekretnine - prikaz stranice sa svim nekretninama
app.get("/nekretnine", (req, res) => {
  try {
    res.render("nekretnine.ejs", { aktivnaStranica: "nekretnine" });
  } catch (error) {
    console.error("Greška pri prikazu nekretnina:", error);
     res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// GET /statistike - prikaz statistika (samo za prijavljene korisnike)
app.get("/statistike", (req, res) => {
  if (req.session.username) {
    res.render("statistika.ejs", { aktivnaStranica: "statistike" });
  } else {
   res.status(401).render("error.ejs",{message:"Neautorizovan pristup",vratigdje:"Login",path:"/"});
  }
});

// GET /vijesti - prikaz vijesti
app.get("/vijesti", (req, res) => {
  res.render("vijesti.ejs", { aktivnaStranica: "vijesti" });
});

/* ----------------- NEKRETNINE ADDED ROUTES ----------------- */

// GET /nekretnine/top5 - top 5 nekretnina po lokaciji
app.get("/nekretnine/top5", async (req, res) => {
  try {
    if (!req.query.lokacija) throw new Error("Query is needed!");

    let nekretnineData = await readTable("nekretnine");

    nekretnineData = nekretnineData.filter(
      (item) => item.lokacija.toLowerCase() === req.query.lokacija.toLowerCase()
    );

    nekretnineData.sort((a, b) => Date.parse(b.datum_objave) - Date.parse(a.datum_objave));

    res.json(nekretnineData.slice(0, 5));
  } catch (error) {
    console.error("Greška pri /nekretnine/top5:", error);
    res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// GET /nekretnina/:id - detalji nekretnine sa do 3 upita
app.get("/nekretnina/:id", async (req, res) => {
  try {
    let nekretnineData = await readTable("nekretnine");
    let obj = nekretnineData.find((elem) => elem.id == req.params.id);

    if (!obj) return res.status(404).json({ greska: "Nekretnina nije pronađena" });

    obj.upiti = (obj.upiti || [])
      .sort((a, b) => b.id - a.id) // sort descending po id
      .slice(0, 3);

    res.json(obj);
  } catch (error) {
    console.error("Greška pri /nekretnina/:id:", error);
    res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// GET /next/upiti/nekretnina/:id - paginacija upita
app.get("/next/upiti/nekretnina/:id", async (req, res) => {
  try {
    if (!req.query.page) throw new Error("Query is needed!");
    let page = Number(req.query.page);

    let nekretnineData = await readTable("nekretnine");

    let index = nekretnineData.findIndex((elem) => elem.id == Number(req.params.id));
    if (index === -1) return res.status(404).json({ greska: "Nekretnina nije pronađena" });

    let rez = [];
    for (let i = index + page * 3; i < nekretnineData.length; i++) {
      rez.push(nekretnineData[i].upiti || []);
    }

    if (rez.length === 0) res.status(404).json(rez);
    else res.status(200).json(rez);
  } catch (error) {
    console.error("Greška pri /next/upiti/nekretnina/:id:", error);
    res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

/* ----------------- MARKETING ROUTES ----------------- */

/* ----------------- MARKETING ROUTES ----------------- */

// POST /marketing/nekretnine - povećava broj pretraga za više nekretnina
app.post("/marketing/nekretnine", async (req, res) => {
  const { nizNekretnina } = req.body;

  try {
    let preferencije = await readTable("preferencije");

    nizNekretnina.forEach((id) => {
      const nekretnina = preferencije.find((item) => item.id === id);
      if (nekretnina) {
        nekretnina.pretrage = (nekretnina.pretrage || 0) + 1;
      }
    });

    await saveTable("preferencije", preferencije);

    res.status(200).json({});
  } catch (error) {
    console.error("Greška prilikom ažuriranja pretraga:", error);
    res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// POST /marketing/nekretnina/:id - povećava broj klikova na pojedinačnoj nekretnini
app.post("/marketing/nekretnina/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const preferencije = await readTable("preferencije");

    const nekretninaData = preferencije.find((item) => item.id === parseInt(id, 10));

    if (nekretninaData) {
      nekretninaData.klikovi = (nekretninaData.klikovi || 0) + 1;
      await saveTable("preferencije", preferencije);

      res.status(200).json({ success: true, message: "Broj klikova ažuriran." });
    } else {
      res.status(404).json({ error: "Nekretnina nije pronađena." });
    }
  } catch (error) {
    console.error("Greška prilikom ažuriranja klikova:", error);
    res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// POST /marketing/osvjezi/pretrage - vraća trenutne pretrage za zadane nekretnine
app.post("/marketing/osvjezi/pretrage", async (req, res) => {
  const { nizNekretnina } = req.body || { nizNekretnina: [] };

  try {
    const preferencije = await readTable("preferencije");

    const promjene = nizNekretnina.map((id) => {
      const nekretninaData = preferencije.find((item) => item.id === id);
      return { id, pretrage: nekretninaData ? nekretninaData.pretrage || 0 : 0 };
    });

    res.status(200).json({ nizNekretnina: promjene });
  } catch (error) {
    console.error("Greška prilikom osvježavanja pretraga:", error);
    res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// POST /marketing/osvjezi/klikovi - vraća trenutne klikove za zadane nekretnine
app.post("/marketing/osvjezi/klikovi", async (req, res) => {
  const { nizNekretnina } = req.body || { nizNekretnina: [] };

  try {
    const preferencije = await readTable("preferencije");

    const promjene = nizNekretnina.map((id) => {
      const nekretninaData = preferencije.find((item) => item.id === id);
      return { id, klikovi: nekretninaData ? nekretninaData.klikovi || 0 : 0 };
    });

    res.status(200).json({ nizNekretnina: promjene });
  } catch (error) {
    console.error("Greška prilikom osvježavanja klikova:", error);
    res.status(500).render("error.ejs",{message:"Internal Server error",vratigdje:"Login",path:"/"});
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
