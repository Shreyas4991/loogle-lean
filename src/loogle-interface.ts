import * as loogleAPI from './loogle-api';
import * as vscode from 'vscode';
import * as constants from './constants';



export function showLoogleSearchBar(context: vscode.ExtensionContext, initialContent?: string) {
    let options : vscode.InputBoxOptions = {
        prompt : "Type in your Loogle Query",
        title: constants.loogleSearchBarTitle,
        placeHolder: "Loogle Search"
    };
    let inputBox = vscode.window.createInputBox();
    inputBox.prompt = options.prompt;
    inputBox.title = options.title;
    inputBox.placeholder = "Loogle Search";
    if(typeof initialContent !== 'undefined') {
        inputBox.value = initialContent;
    }

    inputBox.show();
    loogleSearchBarResponse(context, inputBox);
}




function loogleSearchBarResponse(
    context : vscode.ExtensionContext,
    inputBox : vscode.InputBox) {
    let response = inputBox.onDidAccept(() =>{
        let query = inputBox.value;
            if (typeof query === 'undefined') {
                console.log(constants.noQueryEnteredYetErr);
                return;
            }
            else if (query.trimStart() === '') {
                vscode.window.showErrorMessage(constants.noQueryEnteredYetErr);
                return;
            }
            else {
                //vscode.window.showInformationMessage("Querying Loogle! Give me some time");
                let loadingButton = {
                    iconPath: new vscode.ThemeIcon('loading~spin'),
                    tooltip : constants.docButtonToolTip
                };
                inputBox.buttons = [loadingButton];
                let response = loogleAPI.callLoogle(context, query);
                //insert loading image here

                response.then(async (message) => {
                    let mjson = await (message.json());
                    console.log(mjson);
                    inputBox.hide();
                    processLoogleJSON(context, query, mjson);
                });
                //console.log(response);
            }
        }
    );
}



function processLoogleJSON(
    context: vscode.ExtensionContext,
    query: string,
    message: any) {

    if (typeof message === 'undefined') {
        vscode.window.showInformationMessage("Lean Loogle server cannot be reached");
    }
    else {
        if (message === null) {
            vscode.window.showInformationMessage("no response from loogle");
        }
        else {
            if ('hits' in message) {
                let loogleHitList = loogleAPI.getHitList(message.hits);
                let quickPickOpts : vscode.QuickPickOptions = {
                    canPickMany : false,
                    placeHolder: "Filter through the hits. Hit Alt + ← to go back and try another term",
                    matchOnDescription: true,
                    matchOnDetail : true
                };
                console.log('hit!!');
                if(typeof loogleHitList === `undefined` || loogleHitList.length === 0) {
                    vscode.window.showErrorMessage(constants.cantFindHitsOrSuggestionsErr);
                    showLoogleSearchBar(context, query);
                }
                else {
                    let hitTitle : string;
                    let hitCount = loogleHitList.length;
                    if(hitCount === 1) {
                        hitTitle = `${hitCount} ${constants.hitMenuSingularTitle}.`;
                    }
                    else {
                        hitTitle = `${loogleHitList.length} ${constants.hitMenuTitle}`;
                    }
                    let quickpick = showHitOptions(context, hitTitle, query, loogleHitList,quickPickOpts);
                }


            }
            else if ('error' in message) {
                let suggestionList = loogleAPI.getSuggestionList(message.suggestions);
                console.log("ERROR!! " + message.error);
                let quickPickOpts : vscode.QuickPickOptions = {
                    canPickMany : false,
                    placeHolder : "Choose one of the suggestions, or Hit Alt + ← to go back and try another term"
                };
                if(typeof suggestionList === `undefined` || suggestionList.length < 1) {
                    vscode.window.showErrorMessage(constants.cantFindHitsOrSuggestionsErr);
                    showLoogleSearchBar(context, query);
                }
                else
                {
                    let quickpick = showSuggestionOptions(context, constants.suggestionsMenuTitle, query, suggestionList, quickPickOpts);
                }
            }
            else {
                vscode.window.showErrorMessage(`If you are seeing this message, there was an error in the loogle API's response. Contact us on the [Zulip Server](${constants.zulipLinkBugs})`);
            }

        }
    }
}



function showHitOptions(
    context : vscode.ExtensionContext,
    title : string,
    query : string,
    hitList : loogleAPI.LoogleHit[],
    options : vscode.QuickPickOptions) {


        let quickpick = vscode.window.createQuickPick();
        quickpick.items = hitList.map((hit) => {return hit.projectQPI();});
        console.log(`showHitOptions : ${quickpick.items.length}`);
        quickpick.placeholder = options.placeHolder;
        quickpick.matchOnDescription = options.matchOnDescription || true;
        quickpick.matchOnDetail = options.matchOnDetail || true;

        //quickpick.value = query;
        let urls: any= {};
        for (const hit of hitList) {
            urls[hit.quickPickItem.label] = hit.moduleUri;
        }
        let modules: any = {};
        for (const hit of hitList) {
            modules[hit.quickPickItem.label] = hit.moduleName;
        }
        quickpick.title = title;

        let backbutton = vscode.QuickInputButtons.Back;
        //backbutton.tooltip = "Go back";
        quickpick.buttons = [backbutton];

        let acceptDisp = quickpick.onDidAccept((event) => {
            let activeItem = quickpick.activeItems[0];
            console.log("QuickPick: " + quickpick.title);
            insertOrCopy(activeItem.label, modules[activeItem.label], quickpick);
        });
        let buttonBack = quickpick.onDidTriggerButton((button) => {
            if(button === vscode.QuickInputButtons.Back) {
                showLoogleSearchBar(context, query);
            }
        });

        let buttonItemDisp = quickpick.onDidTriggerItemButton((event) => {
            let item = event.item.label;
            if(event.button.tooltip === constants.insertButtonToolTip) {
                insertOrCopy(item, modules[item], quickpick);
            }
            else if (event.button.tooltip === constants.copyButtonToolTip) {
                vscode.window.showInformationMessage(`Copied ${item} to clipboard`);
                vscode.env.clipboard.writeText(item);
                quickpick.hide();
            }
            else if (event.button.tooltip === constants.docButtonToolTip) {
                //vscode.window.showInformationMessage(`Going to open ${urls[item]} in an external browser`);
                quickpick.hide();
                vscode.env.openExternal(urls[item]);
            }
            else {
                vscode.window.showInformationMessage(`Not sure what button that was. Report this on [Zulip](${constants.zulipLinkBugs})`);
            }

        });

        quickpick.show();
        context.subscriptions.push(acceptDisp);
        context.subscriptions.push(buttonItemDisp);
        context.subscriptions.push(buttonBack);
        return quickpick;

}

function insertOrCopy(item: string, module: string, quickpick : vscode.QuickPick<vscode.QuickPickItem>) {
    let editor = vscode.window.activeTextEditor;
    if (typeof editor === 'undefined') {
        console.log('No active editor found. Copying item to clipboard');
        vscode.window.showInformationMessage(`Copied ${item} to clipboard`);
        vscode.env.clipboard.writeText(item);
    }
    else {
        let activePosition = editor.selection.active;
        console.log(`Inserting result at ${activePosition.character}, ${activePosition.line}`);
        editor.edit((editBuilder) => {
            editBuilder.insert(activePosition, item);
        });
    }
    quickpick.hide();
}

function showSuggestionOptions(
    context : vscode.ExtensionContext,
    title : string,
    query : string,
    suggestList : vscode.QuickPickItem[],
    options : vscode.QuickPickOptions) {

        let quickpick = vscode.window.createQuickPick();
        quickpick.items = suggestList;
        quickpick.title = title;
        quickpick.placeholder = options.placeHolder;
        //quickpick.value = query;


        let backbutton = vscode.QuickInputButtons.Back;
        quickpick.buttons = [backbutton];
        let acceptDisp = quickpick.onDidAccept((event) => {
            let activeItem = quickpick.activeItems[0];
            console.log("QuickPick: " + quickpick.title);
            handleSuggestion(context, activeItem.label, quickpick);
        });

        let buttonBack = quickpick.onDidTriggerButton((button) => {
            if(button === vscode.QuickInputButtons.Back) {
                showLoogleSearchBar(context, query);
            }
        });
        quickpick.show();
        context.subscriptions.push(acceptDisp);
        context.subscriptions.push(buttonBack);
        return quickpick;
}

function handleSuggestion(
    context: vscode.ExtensionContext,
    suggestion : string,
    suggestionQuickPick: vscode.QuickPick<vscode.QuickPickItem>) {
    let loadingButton = {
            iconPath: new vscode.ThemeIcon('loading~sync'),
            tooltip : "Loading"
        };
    suggestionQuickPick.buttons.concat(loadingButton);
    let response = loogleAPI.callLoogle(context, suggestion);
    response.then(async (message) => {
        let mjson = await (message.json());
        processLoogleJSON(context, suggestion, mjson);
    });
}
