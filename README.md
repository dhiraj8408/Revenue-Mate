# Revenue-Mate

REVENUE MATE is a Point of Sale (POS) web application designed to help businesses seamlessly record sales and expenses. With an intuitive interface, REVENUE MATE provides comprehensive tracking of expenditure and sales, enabling businesses to manage their financials effectively.
Streamline Your Sales, Simplify Your Success

## Features

- **POS Sales Recording**: Effortlessly record sales transactions with our user-friendly POS system. Track each sale with detailed information including date, time, items sold and payment method.

- **Expense Recording**: Keep a meticulous record of all business expenses. Input details such as expense category, amount, date, and vendor to maintain a clear overview of your expenditures.

- **Transaction and Expenses Viewing**: View your sales and expenses transactions in an organized manner. Our application provides a comprehensive list of all recorded transactions, making it easy to monitor your financial activities.

- **Filtering Transactions and Expenses**: Filter through your transactions and expenses using various criteria such as category, or payment type. This feature helps you quickly find specific transactions and analyze your financial data more efficiently.

- **Inventory Management**: Manage your inventory with ease. Add, Delete , and track items in your inventory

## Pages (or) Sections (or) EndPoints
- **Home** : This page provides you a brief description about REVENUE MATE

  <img width="925" alt="image" src="https://github.com/user-attachments/assets/9c401364-13c4-472f-8e72-475e41ba77e2">
  
- **SignUp** : Users can SignUp for services via email (or) Google
  
  <img width="928" alt="image" src="https://github.com/user-attachments/assets/ffe9b8e4-91c6-4ec9-ad71-c0bb50bac67d">
  
- **Login** : Registered users can login from here
  
  <img width="911" alt="image" src="https://github.com/user-attachments/assets/c171a946-41ff-4a35-91e2-6b04d2b165f8">
  
- **Merchant Home** : Merchant can record POS sales (or) record expenses and navigate to profile section (or) to Manage Inventory
  
  <img width="924" alt="image" src="https://github.com/user-attachments/assets/e1556ef2-5fd4-4046-a61e-9b3ebaf28f84">
  
- **Profile** : Merchnat can view all types of transactions sales (or) expenses and track them by applying specific filters
  
  <img width="927" alt="image" src="https://github.com/user-attachments/assets/620b2bf2-543f-4578-b174-07bdb57fa482">
  
- **Inventory** : Merchant here can view current inventory , add (or) delete items from inventory
  
  <img width="930" alt="image" src="https://github.com/user-attachments/assets/eaa71a18-a118-4779-a780-03389f0379ed">

  
## Implementatin Details / Tech Stack

- **Node.js**: A JavaScript runtime built on Chrome's V8 JavaScript engine, used for server-side development.
- **Express.js**: A fast, unopinionated, minimalist web framework for Node.js, used to build the web server to handle HTTP requests.
- **PostgreSQL**: A powerful, open-source relational database system, used for storing and managing details regarding users, sales, expenses, and inventory.
- **Passport.js**: A middleware for authentication in Node.js applications, used to handle user authentication and authorization.
- **EJS (Embedded JavaScript)**: A templating language for generating and rendering dynamic web pages.
- **Authentication**: Included local and Google strategies via the usage of Passport.js and employed bcrypt hashing and salting to store passwords safely and ensure no possible data breaches.

## Overview of Tables and Data Stored in Databases with PostgreSQL
- **User Lists**: This table contains user details along with their salted passwords. It assigns a unique primary key, *ID*, which serves as a foreign key for other tables.
  
  <img width="691" alt="image" src="https://github.com/user-attachments/assets/e4f7a544-be18-4761-89c9-1da5ac8771cf">
  
- **Inventory** : This table stores all items along with their prices for a particular user. Each row (or item) has a primary key, *ID*, and a foreign key, *MerchantId*, 
  which refers to the merchant in the User Lists table.

  <img width="330" alt="image" src="https://github.com/user-attachments/assets/60f455dc-4cba-4fe5-a21c-c7eb7ee706ee">
  
- **Sales** : This table stores the date and time of purchase, customer name, amount, list of items sold, and mode of payment. Each row has a primary key, *ID*, and a foreign key, *MerchantId*, which refers to the merchant in the User Lists table.

  <img width="696" alt="image" src="https://github.com/user-attachments/assets/17c471e4-f169-4b31-b2af-b65a920bea71">
  
- **Expenditures** : This table stores the date and time of purchase, vendor name, amount, reason for the expense, and mode of payment. Each row has a primary key, *ID*, and a foreign key, *MerchantId*, which refers to the merchant in the User Lists table.

  <img width="639" alt="image" src="https://github.com/user-attachments/assets/7a01f133-e614-4105-adca-2f9a963b33c7">

## npm Modules

- **express**: The Express.js framework.
- **pg**: PostgreSQL client for Node.js.
- **passport**: Authentication middleware for Node.js.
- **passport-local**: Passport strategy for authenticating with a username and password.
- **passport-google-oauth20**: Passport strategy for authenticating with Google using OAuth 2.0.
- **ejs**: Templating language for generating HTML markup with plain JavaScript.
- **bcrypt**: Library to help hash passwords.
- 
## If you wish to give it a try follow the video on the link :
- *https://drive.google.com/file/d/1VL3UI73Mzj3tr1CUhCnOFSn9oAvicprx/view?usp=sharing*
