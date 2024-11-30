const Alpaca = require('@alpacahq/alpaca-trade-api');
const { post } = require('@alpacahq/alpaca-trade-api/dist/resources/order');
const alpaca = new  Alpaca(); //Enviroment Variables

const websocket = require('ws');

//websocket 
//server <---> data source
//communication can go both ways
//data source can send us information
//send data to the data source (authenticate, ask what data we want )
//websockets are like push notification in your phone
//whenever an event happens, you will get notification

const wss = new websocket("wss://stream.data.alpaca.markets/v1beta1/news");

wss.on('open', ()=> {
    console.log("websockets connected");
    //we now have to log into the data source
    const authMsg = {
        action : 'auth',
        key: process.env.APCA_API_KEY_ID,
        secret: process.env.APCA_API_SECRET_KEY

    }
    wss.send(JSON.stringify(authMsg)); //send  auth data to the ws

    //subscribe to all news feed
    const subscribeMsg = {
        action:'subscribe',
        news:['*']
    }
    wss.send(JSON.stringify(subscribeMsg)); //connecting us to the  live data source of news
})

wss.on('message', async function(message){
    console.log("Message is" + message);
    //message is a string
    const currentEvent = JSON.parse(message)[0];
    if(currentEvent.T === "n"){ //this is a news event 
        let companyImpact = 0;
        //ask chatgpt its thought on headline
        const apiRequestBody = {
            "model": "gpt-3.5-turbo",
            "messages":[
                {role:"system", content:"only respond with a number  from 1-100 detailing the impact of the headline "  },
                {role:"user", content:"Given the headline'" + currentEvent.headline + "',show me a number  from 1-100 detailing the impact of the headline "}
            ]
        }

        await fetch("https://api.openai.com/v1/chat/completions",{
            method: "POST",
            headers: {
                "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
                "Content-Type": "application/json"

            },
            body: JSON.stringify(apiRequestBody)

        }).then((data) => {
            return data.json();
        }).then((data)=>{
            //data is the chatgpt response
            console.log(data);
            console.log(data.choices[0].message);
            companyImpact = parseInt(data.choices[0].message.content);
        })
        //make trades on the output (of the impact saved in company impact)
        const tickerSymbol = currentEvent.symbols[0];
        if(companyImpact>=70){
            //buy stock
            let order = await alpaca.createOrder({
                symbol: tickerSymbol,
                qty:1,
                side:'buy',
                type:'market',
                time_in_force:'day' //days ends, it won't trade

            })
        } else if(companyImpact <=30){
            //sell stocks
            let closedPosition = alpaca.closePosition("SHOP"); //tickerSymbol
        }
        //1-100, 1 being the most negative and 100 being the most positive on a company
        //if score >=70 , then buy the stock
        //else if impact<= 30 sell all of stcoks


    }
})