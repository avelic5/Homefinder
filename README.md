# 🏠 HomeFinder Web Application
<!-- Place your main screenshot here -->
![pocetna](https://github.com/user-attachments/assets/32485f6f-a5b2-467b-a6a3-cbfd38c7896b)

Welcome to **HomeFinder** – your go-to platform for browsing properties, submitting inquiries, and managing your user profile. This is the **first version** of the application and is open for future improvements!  

🌐 **Live Demo:** [https://homefinder-cdye.onrender.com/](https://homefinder-cdye.onrender.com/)

---

## ✨ Features

### 👤 User Authentication & Profile
- 🔒 Secure sign-up and login with bcrypt password hashing
- 📝 View and update user profile
- ⏱️ Session management with automatic logout after inactivity
- 🚫 Block login attempts after multiple failed tries

### 🏡 Property Management
- 🏘️ Browse all properties
- 🔍 Top 5 properties filtered by location
- 📄 Detailed property pages with up to 3 latest inquiries
- 📑 Submit and view inquiries (paginated)

### 📊 Marketing & Analytics
- 📈 Track property searches and clicks
- 🔄 Refresh current clicks and searches dynamically
- 🛠️ Prepared for future marketing dashboards

### ⚠️ Error Handling
- ❌ Friendly error pages for unauthorized access, missing resources, and server errors

---

## 🛠️ Technologies Used

- **Backend:** Node.js, Express.js  
- **Frontend:** HTML, CSS, JavaScript  
- **Database:** PostgreSQL (`pg` package)  
- **Templating:** EJS  
- **Authentication:** bcrypt, express-session  
- **Environment Variables:** dotenv  
- **Other:** method-override  

---

## 🎨 Frontend Enhancements

- 💻 **Interactive UI:** Dynamic updates for properties, inquiries, and marketing analytics
- 🔄 **Carousel / Slideshow:** Smooth navigation through property images
- 📊 **Statistics & Charts:** Price histograms, average square footage, and outlier detection using Chart.js
- ✨ **CSS Animations:** Subtle transitions and hover effects enhance user experience
- 🛠️ **Real-time Updates:** Top properties, clicks, and search stats are refreshed dynamically

---

## ⚡ Notes

- This is the **first version**, and further improvements like advanced filtering, notifications, and enhanced analytics dashboards are planned.
- The project demonstrates a full-stack approach integrating **Node.js**, **PostgreSQL**, **EJS templating**, and **dynamic frontend interactions**.
- CSS animations and dynamic UI updates improve the user experience and make the interface more responsive and interactive.
