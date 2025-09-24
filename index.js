const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs").promises; // Using asynchronus API for file read and write
const bcrypt = require("bcrypt");
const { read } = require("fs");
const app = express();
const PORT = 3000;
const methodOverride = require('method-override');



app.use(methodOverride('_method'));
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


/* ---------------- SERVING HTML -------------------- */

// Async function for serving html files
async function serveHTMLFile(req, res, fileName) {
  const htmlPath = path.join(__dirname, "public/html", fileName);
  try {
    const content = await fs.readFile(htmlPath, "utf-8");
    res.send(content);
  } catch (error) {
    console.error("Error serving HTML file:", error);
    res.status(500).json({ greska: "Internal Server Error" });
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
async function readJsonFile(filename) {
  const filePath = path.join(__dirname, "data", `${filename}.json`);
  try {
    const rawdata = await fs.readFile(filePath, "utf-8");
    return JSON.parse(rawdata);
  } catch (error) {
    throw error;
  }
}

// Async function for reading json data from data folder
async function saveJsonFile(filename, data) {
  const filePath = path.join(__dirname, "data", `${filename}.json`);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    throw error;
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

app.get("/detalji/:id", async (req, res) => {
  let nekretnine = await readJsonFile("nekretnine");
  let nekretnina = nekretnine.find(el=>{
    return el.id==req.params.id;
  });

  nekretnina.aktivnaStranica = "nekretnine";
  res.render("detalji.ejs", nekretnina);
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});
app.post("/signup", async (req, res) => {
  const { ime, prezime, username, password } = req.body;

  if (!username || !ime || !prezime || !password) {
    return res.send("Sva polja su obavezna!");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Ovdje ide kod za spremanje korisnika u bazu
  // npr: const newUser = await db.Users.create({ username, email, password: hashedPassword });
  const users = await readJsonFile("korisnici");
users.push( {
    id: users.length+1,
    ime,
    prezime,
    username,
    password: hashedPassword,
  });
  saveJsonFile("korisnici",users);

  req.session.username = username;

  res.redirect("/");
});

app.post("/login", async (req, res) => {
  const jsonObj = req.body;

  try {
    const data = await fs.readFile(
      path.join(__dirname, "data", "korisnici.json"),
      "utf-8"
    );
    const korisnici = JSON.parse(data);
    let found = false;

    for (const korisnik of korisnici) {
      if (korisnik.username == jsonObj.username) {
        const isPasswordMatched = await bcrypt.compare(
          jsonObj.password,
          korisnik.password
        );
        if (req.session.lockUntil && Date.now() < req.session.lockUntil) {
          console.log("Korisnik je još uvijek blokiran!");

          await fs.appendFile(
            "prijave.txt",
            `${new Date()} - ${korisnik.username} - status: neuspješno \n`
          );

          return res.status(429).json({
            greska:
              "Previse neuspjesnih pokusaja. Pokusajte ponovo za 1 minutu.",
          });
        } else if (isPasswordMatched) {
          req.session.username = korisnik.username;
          found = true;
          req.session.broj_pokusaja_login = 0;
          await fs.appendFile(
            "prijave.txt",
            `${new Date()} - ${korisnik.username} - status: uspješno \n`
          );
          break;
        } else {
          if (!req.session.broj_pokusaja_login)
            req.session.broj_pokusaja_login = 0;
          await fs.appendFile(
            "prijave.txt",
            `${new Date()} - ${korisnik.username} - status: neuspješno \n`
          );
          req.session.broj_pokusaja_login++;
          if (req.session.broj_pokusaja_login === 3) {
            req.session.lockUntil = Date.now() + 30 * 60 * 1000;
            req.session.broj_pokusaja_login = 0;
          }
        }
      }
    }

    if (found) {
      res.json({ poruka: "Uspješna prijava" });
    } else {
      res.json({ poruka: "Neuspješna prijava" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ greska: "Internal Server Error" });
  }
});

// GET ruta za prikaz forme za postavljanje upita
app.get("/makeupit/:id", async (req, res) => {
    let nekretnine = await readJsonFile("nekretnine");

    // Pronađi nekretninu sa prosleđenim id
    let nekretnina = nekretnine.find(el => el.id == req.params.id);

    if (!nekretnina) {
        return res.status(404).send("Nekretnina nije pronađena");
    }

    // Renderuje view makeupit.ejs sa nazivom i id nekretnine
    res.render("makeupit.ejs", {
        id: nekretnina.id,
        naziv: nekretnina.naziv,
        aktivnaStranica:""
    });
});

app.get("/logout", (req, res) => {
  // Check if the user is authenticated
  if (!req.session.username) {
    // User is not logged in
    return res.status(401).json({ greska: "Neautorizovan pristup" });
  }

  // Clear all information from the session
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err);
      res.status(500).json({ greska: "Internal Server Error" });
    } else {
      res.render("prijava.ejs");;
    }
  });
  res.render("prijava.ejs");
});

/*
Returns currently logged user data. First takes the username from the session and grabs other data
from the .json file.
*/

//profil.ejs
app.get("/korisnik", async (req, res) => {
  // Check if the username is present in the session
  if (!req.session.username) {
    // User is not logged in
    return res.status(401).json({ greska: "Neautorizovan pristup" });
  }

  // User is logged in, fetch additional user data
  const username = req.session.username;

  try {
    // Read user data from the JSON file
    const users = await readJsonFile("korisnici");

    // Find the user by username
    const user = users.find((u) => u.username === username);

  

    // Send user data
    const userData = {
      id: user.id,
      ime: user.ime,
      prezime: user.prezime,
      username: user.username,
      password: user.password, // Should exclude the password for security reasons
    };

    res.render("profil.ejs", { user: userData, aktivnaStranica:"korisnik" });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ greska: "Internal Server Error" });
  }
});

/*
Allows logged user to make a request for a property
*/
app.post("/upit/:id", async (req, res) => {
  // Check if the user is authenticated
  if (!req.session.username) {
    // User is not logged in
    return res.status(401).json({ greska: "Neautorizovan pristup" });
  }

  // Get data from the request body
  const {tekst_upita } = req.body;

  try {
    // Read user data from the JSON file
    const users = await readJsonFile("korisnici");

    // Read properties data from the JSON file
    const nekretnine = await readJsonFile("nekretnine");

    // Find the user by username
    const loggedInUser = users.find(
      (user) => user.username === req.session.username
    );

    // Check if the property with nekretnina_id exists
    const nekretnina = nekretnine.find(
      (property) => property.id == req.params.id
    );
    console.log(nekretnina);
    if (!nekretnina) {
      // Property not found
      return res
        .status(400)
        .json({ greska: `Nekretnina sa id-em ${req.params.id} ne postoji` });
    }

    let provjera = nekretnina.upiti.filter((obj) => {
      return obj.korisnik_id === loggedInUser.id;
    });

    if (provjera.length >= 3) {
      return res
        .status(429)
        .json({ greska: "Previse upita za istu nekretninu." });
    }

    // Add a new query to the property's queries array
    nekretnina.upiti.push({
      korisnik_id: loggedInUser.id,
      tekst_upita: tekst_upita,
    });

    // Save the updated properties data back to the JSON file
    await saveJsonFile("nekretnine", nekretnine);
    nekretnina["aktivnaStranica"]="";
     res.render("detalji.ejs", nekretnina);
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({ greska: "Internal Server Error" });
  }
});
app.get("/upiti/moji", async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ greska: "Neautorizovan pristup" });
  }

  try {
    const users = await readJsonFile("korisnici");
    const nekretnine = await readJsonFile("nekretnine");

    const loggedInUser = users.find(u => u.username === req.session.username);
    if (!loggedInUser) return res.status(401).json({ greska: "Neautorizovan pristup" });

    const mojiUpiti = [];
    nekretnine.forEach(n => {
      n.upiti.forEach(u => {
        if(u.korisnik_id === loggedInUser.id){
          mojiUpiti.push({ id_nekretnine: n.id, tekst_upita: u.tekst_upita });
        }
      });
    });

    res.render("mojiupiti.ejs", { mojiUpiti,aktivnaStranica:"" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ greska: "Internal Server Error" });
  }
});

/*
Updates any user field
*/

app.get("/azurirajkorisnik",async (req,res)=>{
  if(req.session.username){
     const users = await readJsonFile("korisnici");
      const user = users.find(
      (user) => user.username === req.session.username
    );
    res.render("azurirajkorisnik.ejs",{aktivnaStranica:"",user});
  }
  else  return res.status(401).json({ greska: "Neautorizovan pristup" });
})
app.put("/korisnik", async (req, res) => {
  // Check if the user is authenticated
  if (!req.session.username) {
    // User is not logged in
    return res.status(401).json({ greska: "Neautorizovan pristup" });
  }

  // Get data from the request body
  const { ime, prezime, username, password } = req.body;

  try {
    // Read user data from the JSON file
    const users = await readJsonFile("korisnici");

    // Find the user by username
    const loggedInUser = users.find(
      (user) => user.username === req.session.username
    );

    if (!loggedInUser) {
      // User not found (should not happen if users are correctly managed)
      return res.status(401).json({ greska: "Neautorizovan pristup" });
    }

    // Update user data with the provided values
    if (ime) loggedInUser.ime = ime;
    if (prezime) loggedInUser.prezime = prezime;
    if (username) loggedInUser.username = username;
    if (password) {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);
      loggedInUser.password = hashedPassword;
    }

    // Save the updated user data back to the JSON file
    await saveJsonFile("korisnici", users);
    res.render("profil.ejs",{aktivnaStranica:"korisnik",loggedInUser})
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({ greska: "Internal Server Error" });
  }
});

/*
Returns all properties from the file.
*/
app.get("/nekretnine", (req, res) => {
  try {
    res.render("nekretnine.ejs", { aktivnaStranica: "nekretnine" });
  } catch (error) {
    console.error("Error fetching properties data:", error);
    res.status(500).json({ greska: "Internal Server Error" });
  }
});
app.get("/statistike", (req, res) => {
  if(req.session.username)
  res.render("statistika.ejs", { aktivnaStranica: "statistike" });
else{
  res.json({ greska: "Neautorizovan pristup" });
}
});
app.get("/vijesti", (req, res) => {
  res.render("vijesti.ejs", { aktivnaStranica: "vijesti" });
});
/* ----------------- NEKRETNINE ADDED ROUTES ----------------- */
app.get("/nekretnine/top5", async (req, res) => {
  try {
    if (!req.query.lokacija) throw new Error("Query is needed!");
    let nekretnineData = await readJsonFile("nekretnine");
    nekretnineData = nekretnineData.filter((item) => {
      return item.lokacija.toLowerCase() === req.query.lokacija;
    });
    nekretnineData.sort(function (a, b) {
      return Date.parse(a.datum_objave) > Date.parse(b.datum_objave);
    });
    res.json(nekretnineData.slice(0, 5));
  } catch (error) {
    console.error("Error while routing /nekretnine/top5:", error);
    res.status(500).json({ greska: error.message });
  }
});
app.get("/nekretnina/:id", async (req, res) => {
  let nekretnineData = await readJsonFile("nekretnine");
  let obj = nekretnineData.find((elem) => elem.id == req.params.id);
  obj.upiti = obj.upiti
    .sort(function (a, b) {
      return a.id < b.id;
    })
    .slice(0, 3);
  res.json(obj);
});

app.get("/next/upiti/nekretnina/:id", async (req, res) => {
  try {
    if (!req.query.page) throw new Error("Query is needed!");
    let nekretnineData = await readJsonFile("nekretnine");
    let page = Number(req.query.page);

    let index = nekretnineData.findIndex(
      (elem) => elem.id === Number(req.params.id)
    );

    let rez = [];
    for (let i = index + page * 3; i < nekretnineData.length; i++) {
      rez.push(nekretnineData[i].upiti);
    }
    if (rez.length === 0) res.status(404).json(rez);
    else res.status(200).json(rez);
  } catch (error) {
    console.error("Error while routing /nekretnine/:id", error);
    res.status(500).json({ greska: error.message });
  }
});

/* ----------------- MARKETING ROUTES ----------------- */

// Route that increments value of pretrage for one based on list of ids in nizNekretnina
app.post("/marketing/nekretnine", async (req, res) => {
  const { nizNekretnina } = req.body;

  try {
    // Load JSON data
    let preferencije = await readJsonFile("preferencije");

    // Check format
    if (!preferencije || !Array.isArray(preferencije)) {
      console.error("Neispravan format podataka u preferencije.json.");
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    // Init object for search
    preferencije = preferencije.map((nekretnina) => {
      nekretnina.pretrage = nekretnina.pretrage || 0;
      return nekretnina;
    });

    // Update atribute pretraga
    nizNekretnina.forEach((id) => {
      const nekretnina = preferencije.find((item) => item.id === id);
      if (nekretnina) {
        nekretnina.pretrage += 1;
      }
    });

    // Save JSON file
    await saveJsonFile("preferencije", preferencije);

    res.status(200).json({});
  } catch (error) {
    console.error("Greška prilikom čitanja ili pisanja JSON datoteke:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/marketing/nekretnina/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Read JSON
    const preferencije = await readJsonFile("preferencije");

    // Finding the needed objects based on id
    const nekretninaData = preferencije.find(
      (item) => item.id === parseInt(id, 10)
    );

    if (nekretninaData) {
      // Update clicks
      nekretninaData.klikovi = (nekretninaData.klikovi || 0) + 1;

      // Save JSON file
      await saveJsonFile("preferencije", preferencije);

      res
        .status(200)
        .json({ success: true, message: "Broj klikova ažuriran." });
    } else {
      res.status(404).json({ error: "Nekretnina nije pronađena." });
    }
  } catch (error) {
    console.error("Greška prilikom čitanja ili pisanja JSON datoteke:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/marketing/osvjezi/pretrage", async (req, res) => {
  const { nizNekretnina } = req.body || { nizNekretnina: [] };

  try {
    // Read JSON
    const preferencije = await readJsonFile("preferencije");

    // Finding the needed objects based on id
    const promjene = nizNekretnina.map((id) => {
      const nekretninaData = preferencije.find((item) => item.id === id);
      return { id, pretrage: nekretninaData ? nekretninaData.pretrage : 0 };
    });

    res.status(200).json({ nizNekretnina: promjene });
  } catch (error) {
    console.error("Greška prilikom čitanja ili pisanja JSON datoteke:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/marketing/osvjezi/klikovi", async (req, res) => {
  const { nizNekretnina } = req.body || { nizNekretnina: [] };

  try {
    // Read JSON
    const preferencije = await readJsonFile("preferencije");

    // Finding the needed objects based on id
    const promjene = nizNekretnina.map((id) => {
      const nekretninaData = preferencije.find((item) => item.id === id);
      return { id, klikovi: nekretninaData ? nekretninaData.klikovi : 0 };
    });

    res.status(200).json({ nizNekretnina: promjene });
  } catch (error) {
    console.error("Greška prilikom čitanja ili pisanja JSON datoteke:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
