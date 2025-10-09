# E-Commerce Project

This is a full-featured e-commerce web application built with Node.js, Express, and MongoDB. It allows users to register, log in, browse products, add items to a shopping cart, and complete a simulated checkout process. Sellers can also manage their own products.

## Features

  * **User Authentication**:
      * User registration and login with password hashing using bcrypt.
      * JWT-based authentication to protect routes.
  * **Product Management**:
      * Sellers can add new products with names, descriptions, prices, and images.
      * Sellers can view, update, and delete their own products.
  * **Shopping Cart**:
      * Users can add products to their shopping cart.
      * Users can view their cart, update item quantities, and remove items.
  * **Checkout Process**:
      * A simulated checkout process allows users to enter their address and phone number.
      * A mock payment page to simulate a transaction.
  * **File Uploads**:
      * Product images are uploaded and stored using Multer.

## Technologies Used

  * **Backend**: Node.js, Express.js
  * **Database**: MongoDB with Mongoose
  * **Authentication**: JSON Web Tokens (JWT), bcrypt
  * **Templating Engine**: EJS
  * **File Uploads**: Multer
  * **Other**: cookie-parser, cors

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

  * Node.js and npm installed.
  * MongoDB installed and running on `mongodb://127.0.0.1:27017/eCommerce`.

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/your-username/your-repository-name.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd your-repository-name
    ```
3.  Install the dependencies:
    ```sh
    npm install
    ```

## Usage

1.  Start the server:
    ```sh
    node app.js
    ```
2.  Open your browser and go to `http://localhost:3000`.

## Folder Structure

```
.
├── app.js              # Main application file
├── modules
│   ├── Cart.js         # Cart model
│   ├── Product.js      # Product model
│   └── User.js         # User model
├── package.json        # Project dependencies
├── public              # Static assets (CSS, images, etc.)
├── uploads             # Uploaded product images
└── views               # EJS templates
    ├── Cart.ejs
    ├── Checkout.ejs
    ├── FrontPage.ejs
    ├── Home.ejs
    ├── Login.ejs
    ├── Payment.ejs
    ├── ProductDetails.ejs
    ├── Register.ejs
    └── sellProducts.ejs
```