import * as vscode from 'vscode';
import fetch from 'node-fetch';

const hitMenuTitle = "Loogle Hits Found";
const suggestionsMenuTitle = "Loogle Suggests";
const loogleSearchBarTitle = "Loogle Search";
const zulipLinkBugs = "https://leanprover.zulipchat.com";
const mathlibDocsURI = "https://leanprover-community.github.io/mathlib4_docs/";
const insertButtonToolTip = 'Insert the term at the cursor location';
const copyButtonToolTip = 'Copy the term to the clipboard';
const docButtonToolTip = 'Open the docs page of the definition';


export function showLoogleSearchBar(context: vscode.ExtensionContext) {
    let options : vscode.InputBoxOptions = {
        prompt : "Type in your Loogle Query", 
        title: loogleSearchBarTitle,
        placeHolder: "Loogle Search"
    };
    let inputBox = vscode.window.showInputBox(options);

    inputBox.then((query) => {
            if (typeof query === 'undefined') {
                console.log("No query given");
                return;
            }
            else if (query.trimStart() === '') {
                vscode.window.showErrorMessage("You haven't typed in any query yet");
                return;	
            }
            else {
                vscode.window.showInformationMessage("Querying Loogle! Give me some time");
                let response = callLoogle(context, query);
                //console.log(response);
            }
            
        });
}
export async function callLoogle(context: vscode.ExtensionContext, query : String) {
    console.log(`log: Loogle called with query ${query}`);
    const loogleURL = 'https://loogle.lean-lang.org/';
    const queryWhiteSpaceRemoved = query.replace(/\s+/g, '+');
    const queryURL = loogleURL + 'json?q='+queryWhiteSpaceRemoved;
    const loogleResponsePromise = fetch(queryURL);

    /*let quickPickOpts : vscode.QuickPickOptions = {
        title: hitMenuTitle, 
        canPickMany : false,
        placeHolder: "Filter through the responses"
    };*/
    //showNextOptions(context, hitMenuTitle, [], quickPickOpts);
    
    const response = (await loogleResponsePromise).json();
    response.then((message) => {
        processLoogleJSON(context,message);
    });
}

function processLoogleJSON(context: vscode.ExtensionContext, message: any) {

    if (typeof message === 'undefined') {
        vscode.window.showInformationMessage("Lean Loogle server cannot be reached"); 
    }
    else {
        if (message === null) {
            vscode.window.showInformationMessage("no response from loogle");
        } 
        else {
            if ('hits' in message) {
                let loogleHitList = getHitList(message.hits);
                let quickPickOpts : vscode.QuickPickOptions = {
                    canPickMany : false,
                    placeHolder: "Filter through the hits"
                };
                console.log('hit!!');
                let quickpick = showHitOptions(context, hitMenuTitle, loogleHitList,quickPickOpts);
                
            }
            else if ('error' in message) {
                let suggestionList = getSuggestionList(message.suggestions);
                console.log("ERROR!! " + message.error);
                let quickPickOpts : vscode.QuickPickOptions = {
                    canPickMany : false,
                    placeHolder : "Filter the suggestions"
                };
                if(typeof suggestionList === `undefined` || suggestionList.length <= 1) {
                    showLoogleSearchBar(context);
                }
                else 
                {
                    let quickpick = showSuggestionOptions(context, suggestionsMenuTitle, suggestionList, quickPickOpts);
                }
            }
            else {
                vscode.window.showErrorMessage(`If you are seeing this message, there was an error in the loogle API's response. Contact us on the [Zulip Server](${zulipLinkBugs})`);
            }
            
        }
    }
    
}
function handleSuggestion(context: vscode.ExtensionContext, suggestion : string) {
    callLoogle(context, suggestion);
}



function showHitOptions(
    context : vscode.ExtensionContext, 
    title : string, 
    hitList : LoogleHit[], 
    options : vscode.QuickPickOptions) {
    
        
        let quickpick = vscode.window.createQuickPick();
        quickpick.items = hitList.map((hit) => {return hit.projectQPI();});
        quickpick.placeholder = options.placeHolder;
        
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
        quickpick.buttons = [backbutton];
        
        let acceptDisp = quickpick.onDidAccept((event) => {
            let activeItem = quickpick.activeItems[0];
            console.log("QuickPick: " + quickpick.title);
            insertOrCopy(activeItem.label, modules[activeItem.label], quickpick);
        });
        let buttonBack = quickpick.onDidTriggerButton((button) => {
            if(button === vscode.QuickInputButtons.Back) {
                showLoogleSearchBar(context);
            }
        });
        
        let buttonItemDisp = quickpick.onDidTriggerItemButton((event) => {
            let item = event.item.label;            
            if(event.button.tooltip === insertButtonToolTip) {
                insertOrCopy(item, modules[item], quickpick);
            }
            else if (event.button.tooltip === copyButtonToolTip) {
                vscode.window.showInformationMessage(`Copied ${item} to clipboard`);
                vscode.env.clipboard.writeText(item);
                quickpick.hide();
            } 
            else if (event.button.tooltip === docButtonToolTip) {
                //vscode.window.showInformationMessage(`Going to open ${urls[item]} in an external browser`);
                quickpick.hide();
                vscode.env.openExternal(urls[item]);
            }
            else {
                vscode.window.showInformationMessage(`Not sure what button that was. Report this on [Zulip](${zulipLinkBugs})`);
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
    suggestList : vscode.QuickPickItem[], 
    options : vscode.QuickPickOptions) {
    
        let quickpick = vscode.window.createQuickPick();
        quickpick.items = suggestList;
        quickpick.title = title;
        quickpick.placeholder = options.placeHolder;
        

        let backbutton = vscode.QuickInputButtons.Back;
        quickpick.buttons = [backbutton];
        let acceptDisp = quickpick.onDidAccept((event) => {
            let activeItem = quickpick.activeItems[0];
            console.log("QuickPick: " + quickpick.title);
            handleSuggestion(context, activeItem.label);
        });

        let buttonBack = quickpick.onDidTriggerButton((button) => {
            if(button === vscode.QuickInputButtons.Back) {
                showLoogleSearchBar(context);
            }
        });
        quickpick.show();
        context.subscriptions.push(acceptDisp);
        context.subscriptions.push(buttonBack);
        return quickpick;
}

interface HitObject {
    name : string;
    type : string;
    module : string;
    doc : string;
}

interface HitDBInterface {
    name : string
    obj : HitObject
};


class LoogleHit {
    quickPickItem : vscode.QuickPickItem;
    moduleUri : string;
    moduleName : string;
    constructor(hitObject: HitObject) {
        let docUrl : string = "https://leanprover-community.github.io/mathlib4_docs/";
        this.quickPickItem = new LoogleHitItem(hitObject);
        this.moduleName = hitObject.module;
        let modulePath = this.moduleName.replace(/\./g,'/').concat('.html').concat(`#${this.moduleName}`);
        this.moduleUri = encodeURI(docUrl.concat(modulePath));
    }
    projectQPI() {
        return this.quickPickItem;
    }

}
class LoogleHitItem implements vscode.QuickPickItem {
    label : string;
    description : string;
    detail: string;
    buttons : vscode.QuickInputButton[];
    
    constructor(hitObject : HitObject) {
        this.label = hitObject.name;
        this.description = ":: ".concat(hitObject.type); 
        this.detail = `Module : ${hitObject.module}`;//`${moduleName} $(link-external-16)`;//(${moduleUri})`);
        let buttonDocs = {
            iconPath: new vscode.ThemeIcon('link-external'),
            tooltip : docButtonToolTip
        };
        let buttonCopytoClipboard = {
            iconPath: new vscode.ThemeIcon('clippy'),
            tooltip : copyButtonToolTip
        };
        let buttonInsert = {
            iconPath: new vscode.ThemeIcon('insert'),
            tooltip : insertButtonToolTip
        };
        this.buttons = [buttonInsert, buttonCopytoClipboard, buttonDocs];
        
    }
}

function getHitList(hits: HitObject[]) : LoogleHit[] {
    let itemList : LoogleHit[] = new Array<LoogleHit>();
    for(const entry of hits) {

        let loogleHitObj = new LoogleHit(entry);
        itemList.push(loogleHitObj);
    }
    return itemList;
}

interface ErrorObject {
    error : string
    suggestions : string []
}

class LoogleErrorSuggestion implements vscode.QuickPickItem {
    label : string;
    constructor(suggestion : string) {
        this.label = suggestion;
    } 
}

function getSuggestionList (suggestions: string []) : LoogleErrorSuggestion[] {
    let itemList : LoogleErrorSuggestion [] = new Array<LoogleErrorSuggestion>();
    if (typeof suggestions === 'undefined') {
        vscode.window.showErrorMessage("The search term yielded no results or alternative suggestions");
        return [];
    }
    else if (suggestions.length <= 1) {
        vscode.window.showErrorMessage("The search term yielded no results and there were no alternative suggestions. Try again");
        return [];
    } else {
        let countEntries = 0;
        for (const entry of suggestions) {
            if (countEntries >= 1) {
                let quickPickEntry = new LoogleErrorSuggestion(entry);
                itemList.push(quickPickEntry);
            }
            countEntries += 1;            
        }
    }
    return itemList;
}

