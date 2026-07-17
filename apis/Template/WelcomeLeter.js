const getWelcomeLeter = (firstName, lastName, username, password, email) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Gamepitara</title>
        <style>
          @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap");
    
          *{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'poppins', sans-serif;
          }
    
          :root {
            --primary: transparent;
            --primaryColor: #0f1c2e;
            --btnText: #fff;
            --btnTextColor: #d1a149;
            --textColor: #5D5C5C;
            --textHeading: #ffffff;
            --textShadow: 0 6px 5px #000000;
          }
    
          .border-line{
              border: 2px solid #Af893F;
              border-radius: 10px;
              border-width: 3px !important;
              border-style: solid !important;
              background: linear-gradient(lightcyan, lightcyan) padding-box, linear-gradient(to right, #f1a408, #000000, #f1a408, #000000) border-box;
              border-radius: 15px !important;
              border: 1px solid transparent !important;
            }
    
          .card {
                border-radius: 8px;
                margin: 40px auto;
                width: 620px; 
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
    
          .info{
              border: 2px solid #Af893F;
              padding: 16px;
              border-radius: 10px;
              border-width: 3px !important;
              border-style: solid !important;
              background: linear-gradient(white, rgb(151 217 255)) padding-box, linear-gradient(to right, #f1a408, #000000, #f1a408, #000000) border-box;
              border-radius: 15px !important;
              border: 2px solid transparent !important;
            }
    
          .top-img-div img{
              border-top-left-radius: 8px;
              border-top-right-radius: 8px;
              width: 100%;
            }
    
          .logo-div{
              width: 50%;
              position: relative;
              left: 25%;
              bottom: 44px;
            }
    
          .logo {
                width: 100%;
            }
    
           
          h1 {
              text-transform: uppercase;
              font-size: 37px;
              margin: 30px auto;
              text-align: center;
              font-family: 'poppins', sans-serif;
            }
    
          .game-name{
              background: radial-gradient(circle, #f1a408 38.43%, black 84.42%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip:text;
              color: transparent;
            }
    
          p {
                font-size: 18px;
                line-height: 1.5;
                margin: 20px auto;
                color: var(--textColor);
            }
    
          .icon{
              width: 16%;
              position: relative;
          }
    
          .icon1{
            width: 15.5%;
            left: 10%;
            top: 96px;
        }
          
      
          .icon2{
            right: -76%;
            bottom: 82px;
          }
    
          .icon3{
            right: -25%;
            bottom: 0;
          }
    
          .icon4{
            right: -25%;
            bottom: -12px;
          }
    
          .codeBtn {
            margin: 20px auto;
            padding: 10px 20px;
            border-radius: 5px;
            border: none;
            background: linear-gradient(to right, #3e9ef3 16.43%, hsl(206deg 100% 50.54%) 100.42%);
            backdrop-filter: blur(10px);
            color: var(--btnText);
            letter-spacing: 2px;
            font-size: 20px;
            display: block;
            cursor: copy;
            }
    
            .credentials {
              padding: 5px;
              margin: 5px auto;
              border-radius: 5px;
            }
    
            .contentDiv {
              color: var(--textColor);
              font-size: 18px;
              text-align: center;
              display: flex;
              justify-content: center;
              margin-bottom: 20px;
            }
    
            .login-info {
                background-color: #f8f9fa;
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 20px;
            }
            .login-info p {
                margin: 5px 0;
                font-size: 12px;
            }
    
            p{
              color: black;
            }
            
            .login-button {
              display: block;
              width: 100%;
              max-width: 250px;
              margin: 40px auto;
              padding: 10px;
              background: linear-gradient(to right, #f1a408 16.43%, black 100.42%);
              color: #ffffff;
              text-align: center;
              text-decoration: none;
              font-size: 18px;
              border-radius: 5px;
              transition: all 0.4s ease;
            }
    
          
          .login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
          }
      
            .social-links {
              text-align: center;
              padding: 20px 0;
            }
      
            .social-links img {
            width: 35px;
            height: 35px;
            margin: 0px 13px;
            transition: transform 0.3s ease;
            }
    
            .social-links img:hover {
              transform: scale(1.2);
            }
      
            .footer {
              text-align: center;
              padding: 20px;
              font-size: 12px;
              color: white;
            }
    
            .footer a {
              color: #4a90e2;
              text-decoration: none;
          }
    
    /* Media Query for Tablets */
    @media screen and (max-width: 768px) {
      .card {
        width: 90%;
        margin: 20px auto;
      }
    
      h1 {
        font-size: 30px;
      }
    
      .icon {
        width: 12%;
      }
    
      .icon1 {
        left: 20% !important;
        top: 72px !important;
      }
    
      .icon2 {
        right: -70% !important;
        bottom: 68px !important;
      }
    
      .icon3 {
        right: -31% !important;
        bottom: 0 !important;
      }
    
      .icon4 {
        right: -32% !important;
        bottom: -18px !important;
      }
    }
    
    /* Media Query for Phones */
    @media screen and (max-width: 480px) {
      .card {
        width: 95%;
        margin: 10px auto;
      }
    
      .info{
        text-align: center;
      }
    
      h1 {
        font-size: 24px;
      }
    
      p {
        font-size: 16px;
        text-align: center;
      }
    
      .icon {
        width: 10%;
      }
    
      .icon1 {
        left: 18% !important;
        top: 59px !important;
      }
    
      .icon2 {
        right: -72% !important;
        bottom: 48px !important;
      }
    
      .icon3 {
        right: -34% !important;
        bottom: 0 !important;
      }
    
      .icon4 {
        right: -34% !important;
        bottom: -10px !important;
      }
    
      .codeBtn {
        font-size: 16px;
        padding: 8px 16px;
      }
    
      .login-button {
        font-size: 16px;
        max-width: 200px;
      }
    
      .social-links img {
        width: 30px;
        height: 30px;
        margin: 0px 8px;
      }
    
      .footer {
        font-size: 10px;
      }
    }
    
        </style>
    </head>
    <body style="background-color: #ffffff;">
        <div class="card border-line">
            <div class="top-img-div">
              <img src="https://gamepitara.com/images/card.png" alt="card-topper">
            </div>
            <div class="logo-div">
              <img class="logo" src="https://gamepitara.com/images/logo.png" alt="Gamepitara Logo">
            </div>
            <div class="info">
                <h1>Welcome to <span class="game-name">Gamepitara</span></h1>
                <div class="contentDiv">
                    <p>Dear ${firstName} ${lastName},</p>
                </div>
                <div class="contentDiv">
                    <p>Your account has been successfully created! Here are your login credentials:</p>
                </div>
                <div class="login-info">
                    <p><strong>Username:</strong> ${username}</p>
                    <p><strong>Password:</strong> ${password}</p>
                    <p><strong>Email:</strong> ${email}</p>
                </div>
                <a href="https://gamepitara.com/login" class="login-button">Login to your account</a>
                <div class="social-links">
                    <a href="https://www.facebook.com/gamepitara"><img src="https://gamepitara.com/images/facebook-icon.png" alt="Facebook"></a>
                    <a href="https://www.twitter.com/gamepitara"><img src="https://gamepitara.com/images/twitter-icon.png" alt="Twitter"></a>
                    <a href="https://www.instagram.com/gamepitara"><img src="https://gamepitara.com/images/instagram-icon.png" alt="Instagram"></a>
                </div>
                <div class="footer">
                    <p>Thank you for joining Gamepitara!</p>
                    <p>If you have any questions, feel free to <a href="mailto:support@gamepitara.com">contact us</a>.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  };

  module.exports = getWelcomeLeter;