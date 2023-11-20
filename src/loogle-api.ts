import * as vscode from 'vscode';
import * as https from 'node:https';
import * as constants from './constants';
import fetch from 'node-fetch';



export async function callLoogle(
    context: vscode.ExtensionContext,
    query : string) {

    console.log(`log: Loogle called with query ${query}`);
    const loogleURL : string = 'https://loogle.lean-lang.org/';
    const queryWhiteSpaceRemoved = query.replace(/\s+/g, '');
    const queryURL = loogleURL
        .concat('json?q=')
        .concat(encodeURIComponent(query));

    let fetchOptions = {
        headers : {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "User-Agent" : `vscode ${vscode.version} loogle-lean ${context.extension.packageJSON.version}`
        }
    };
    const loogleResponsePromise = fetch(queryURL,fetchOptions);
    console.log(queryURL);
    /*let quickPickOpts : vscode.QuickPickOptions = {
        title: hitMenuTitle,
        canPickMany : false,
        placeHolder: "Filter through the responses"
    };*/
    //showNextOptions(context, hitMenuTitle, [], quickPickOpts);
    return loogleResponsePromise;
}


export interface HitObject {
    name : string;
    type : string;
    module : string;
    doc : string;
}

export interface HitDBInterface {
    name : string
    obj : HitObject
};


export class LoogleHit {
    quickPickItem : LoogleHitItem;
    moduleUri : string;
    moduleName : string;
    constructor(hitObject: HitObject) {
        let docUrl : string = "https://leanprover-community.github.io/mathlib4_docs/";
        this.quickPickItem = new LoogleHitItem(hitObject);
        this.moduleName = hitObject.module;
        let modulePath = this.moduleName.replace(/\./g,'/').concat('.html').concat(`#${this.quickPickItem.label}`);
        this.moduleUri = encodeURI(docUrl.concat(modulePath));
    }
    projectQPI() {
        return this.quickPickItem;
    }

}
export class LoogleHitItem implements vscode.QuickPickItem {
    label : string;
    description : string;
    detail: string;
    buttons : vscode.QuickInputButton[];

    constructor(hitObject : HitObject) {
        this.label = hitObject.name;
        this.description = ":: ".concat(hitObject.type);
        let shouldModule = vscode.workspace.getConfiguration().get("loogle-lean.showModuleName");
        console.log(shouldModule);
        if(shouldModule === true) {
            this.detail = `Module : ${hitObject.module}`;//`${moduleName} $(link-external-16)`;//(${moduleUri})`);
        }
        else {
            this.detail = "   ";//`${moduleName} $(link-external-16)`;//(${moduleUri})`);
        }

        let buttonDocs = {
            iconPath: new vscode.ThemeIcon('link-external'),
            tooltip : constants.docButtonToolTip
        };
        let buttonCopytoClipboard = {
            iconPath: new vscode.ThemeIcon('clippy'),
            tooltip : constants.copyButtonToolTip
        };
        let buttonInsert = {
            iconPath: new vscode.ThemeIcon('insert'),
            tooltip : constants.insertButtonToolTip
        };
        this.buttons = [buttonInsert, buttonCopytoClipboard, buttonDocs];

    }
}

export function getHitList(hits: HitObject[]) : LoogleHit[] {
    let itemList : LoogleHit[] = new Array<LoogleHit>();
    for(const entry of hits) {

        let loogleHitObj = new LoogleHit(entry);
        itemList.push(loogleHitObj);
    }
    return itemList;
}

export interface ErrorObject {
    error : string
    suggestions : string []
}

export class LoogleErrorSuggestion implements vscode.QuickPickItem {
    label : string;
    constructor(suggestion : string) {
        this.label = suggestion;
    }
}

export function getSuggestionList (suggestions: string []) : LoogleErrorSuggestion[] {
    let itemList : LoogleErrorSuggestion [] = new Array<LoogleErrorSuggestion>();
    if (typeof suggestions === 'undefined') {
        return [];
    }
    else if (suggestions.length <= 1) {
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
        console.log(`getSuggestionList: else case: ${itemList[0].label}`);
    }
    return itemList;
}

