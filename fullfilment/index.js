'use strict';

const functions = require('firebase-functions');
const { DialogflowApp } = require('actions-on-google');
const request = require('request');

console.log(apiHandler());
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    if (request.body.result) {
        processRequest(request, response);
    } else {
        console.log('Invalid Request');
        return response.status(400).end('Invalid Webhook Request (expecting v1 or v2 webhook request)');
    }
});

function processRequest(request, response) {
    let action = request.body.result.action;
    const app = new DialogflowApp({request: request, response: response});
    const actionHandlers = {
        'input.welcome': () => {
            apiHandler().then((output) => {
                let noOfPeopleInSpace = output["number"];
                let response = "Hi, they are currently " + noOfPeopleInSpace + " people in space. " +
                    "Would you like to find out who they are?";
                console.log(response);
                app.ask(app.buildRichResponse()
                    .addSimpleResponse(response)
                    .addSuggestions(['yes', 'no'])
                );
            });
        },
        'input.unknown': () => {
            let response = "Sorry I didn't get that. Please say 'Yes' if you want to find out more about" +
                " the astronauts who are in space or say 'No' to quit";
            app.ask(app.buildRichResponse()
                .addSimpleResponse(response)
                .addSuggestions(['Yes', 'No'])
            );
        },
        'input.details': () => {

            apiHandler().then((output) => {
                if (output['number'] === 0) {
                    app.tell("There is no one in space");
                } else if (output['number'] === 1) {
                   app.tell("The only person currently in space is: " + output['people'][0]['name']);
                } else {
                    let response = "People in space are: ";
                    let carousel = app.buildBrowseCarousel();
                    for (var i = 0; i < output['people'].length; i++) {
                        let coma = (i === output['people'].length - 1) ? "." : ",";
                        let name = output['people'][i]['name'];
                        let biolink = output['people'][i]['biolink'];
                        let biophoto = output['people'][i]['biophoto'];
                        let bio = output['people'][i]['bio'];
                        response += " " + name + coma;
                        carousel.addItems(app.buildBrowseItem(name, biolink)
                            .setDescription(bio)
                            .setImage(biophoto, name)
                        )
                    }
                    app.tell(app.buildRichResponse()
                        .addSimpleResponse(response)
                        .addBrowseCarousel(carousel)
                    );

                }
            });
        },
        'input.quit': () => {
            app.tell('Ok, Bye');
        }
    };
    if (!actionHandlers[action]) {
        action = 'input.unknown';
    }
    actionHandlers[action]();
}

function apiHandler() {
    return new Promise((resolve, reject) => {
        request.get(
            {url: 'http://www.howmanypeopleareinspacerightnow.com/peopleinspace.json'},
            function (error, response, body) {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('statusCode:', response && response.statusCode);
                console.log('body:', body);
                let parsedBody = JSON.parse(body);
                resolve(parsedBody);
            });
    });
}