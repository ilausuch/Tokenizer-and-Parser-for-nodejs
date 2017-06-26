/*!
 * Ebnf
 * Copyright(c) 2017 Ivan Lausuch
 * MIT Licensed
 */

/* global Token */

'use strict'

const Tokenizer=require("./Tokenizer");
const colors = require('colors');

/**
 * EBNF Grammar with addons
 */
const EBNF_tokens={    
    rule:Tokenizer.RegularExpressions.Identifier,
    comment:/\(\*.*\)\)/mi,
    scpecialSequence:/\?.*\?/mi,
    definition:"=",
    concatenation:",",
    termination:";",
    alternation:"|",
    optional_start:"[",
    optional_end:"]",
    repetition_start:"{",
    repetition_end:"}",
    grouping_start:"(",
    grouping_end:")",
    string:Tokenizer.RegularExpressions.String,
    exception:"-",
    sp:Tokenizer.RegularExpressions.Whitespace,
    AST_main_token:"^",
    AST_ignore_token:"!"
};

/**
 * Global configuration for all parser objects
 */
var GlobalConfiguration={
    EndOfFile:"$$$",
    DebugMode:false
};

class ParserTreeNode{
    constructor(type,children){
        this.type=type;
        this.children=children;
        this.childrenRules=[];
        this.childrenTokens=[];
        
        if (children!==undefined){
            children.forEach(function(item){
               if (item.isToken)
                   this.childrenTokens.push(item);
               else
                   this.childrenRules.push(item);
            },this);
        }
    }
    
    get isToken(){
        return this.type==="token";
    }
    
    get isRule(){
        return this.type==="rule";
    }
};

class ParserTreeNodeRule extends ParserTreeNode{
    constructor(ruleName,children,extra){
        super("rule",children);
        
        this.ruleName=ruleName;
        this.extra=extra;
    }
    
    print(desp){
        if (desp===undefined)
            desp="";
        
        console.log(desp+"R "+this.ruleName+" -->");
        this.children.forEach(function(child){
            child.print(desp+"  ");
        });
    }
};

class ParserTreeNodeToken extends ParserTreeNode{
    constructor(syntaxType,token,index,AST_main_token,AST_ignore_token){
        super("token");
        
        this.syntaxType=syntaxType;
        this.token=token;
        this.index=index;
        this.AST_main_token=AST_main_token;
        this.AST_ignore_token=AST_ignore_token;
    }
    
    print(desp){
        if (desp===undefined)
            desp="";
        
        var modChar=" ";
        if (this.AST_main_token)
            modChar="^ ";
        
        console.log(desp+"T"+modChar+this.token.value+" ("+this.token.type+" as "+this.syntaxType+")");
    }
}

class ParserTreeNodeAst extends ParserTreeNode{
    constructor(token,left,right,deep){
        super("ast");
        this.token=token;
        this.left=left;
        this.right=right;
        this.deep=deep;
    }
    
    print(desp){
        if (desp===undefined)
            desp="";
        
        console.log(desp+this.token.value+"("+this.token.type+") - "+this.deep);
        
        if (this.left.length>0){
            console.log(desp+" L:");
            this.left.forEach(function(item){
                item.print(desp+"   ");
            });
        }
        
        if (this.right.length>0){
            console.log(desp+" R:");
            this.right.forEach(function(item){
                item.print(desp+"   ");
            });
        }
    };
    
}


/**
 * EBNF Parser
 */
class Parser{
    
    /**
     * Creates the parser object. rules must be an object of <rule name>:<EBNF rule string>
     * @param {object} rules
     * @param {Tokenizer} tokenizer
     * @returns {nm$_Parser.Parser}
     */
    constructor(rules,tokenizer){
        this.rules=rules;
        this.tokenizer=tokenizer;
        this.BnfExtendedRules=[];
        this.checkConfig();
    }
           
    /**
     * (Private) Check config.
     * @returns {undefined} Throws an exception if something diden't work
     */
    checkConfig(){
        if (this.rules===undefined)
            throw "EBNF: A rules object must be specified";
        
        if (this.rules.grammar===undefined)
            throw "EBNF: A grammar rule must be specified";
        
        if (this.tokenizer===undefined)
            throw "EBNF: Tokenizer must be specified";
        
        //Create a grammar tokenizer
        var grammarTokenizer=new Tokenizer.Tokenizer(EBNF_tokens,{ignoredTokens:["sp"]});
        
        //Parse all rules
        for (var ruleName in this.rules){
            var ruleRaw=this.rules[ruleName];
            if (typeof ruleRaw === 'string' || ruleRaw instanceof String)
                this.rules[ruleName]=grammarTokenizer.parse(ruleRaw);
        }
        
        //Check if a ruler name is the same than token name
        for(var token in this.tokenizer.tokens)
            for(var rule in this.rules)
                if (rule===token)
                    throw "EBNF: The rule "+rule+" has the same name than a token";
        
        //Check special modifiers
        //& Change type of tokens to distinct between this.rules and tokens
        //& Convert to BNF
        for (var ruleName in this.rules){
            this.updateSpecials(ruleName);
            this.updateTypes(ruleName);
            this.convertToBNF(ruleName);
        }
        
        //Tree of options
        for (var ruleName in this.rules){
            this.convertToTreeOfOptions(ruleName);
        }
        
        //Add end of file to grammar
        this.rules["grammar"].forEach(function(ruleOption){
            ruleOption.push(new Tokenizer.Token("token",GlobalConfiguration.EndOfFile));
        });
    };
   
    /**
     * (Private) Update grammar list with special modifiers
     * @param {type} ruleName
     * @returns {undefined}
     */
    updateSpecials(ruleName){
        var $this=this;
        
        var previousToken=undefined;
        var AST_main_token_index=undefined;
        
        var updatedRuleList=[];
        
        this.rules[ruleName].forEach(function(token,index){
            var foundModifier=false;
            
            if (token.type==="AST_main_token"){
                if (previousToken===undefined)
                    throw "EBNF: In rule "+ruleName+" there are a ^ modifiers as first token";
                
                if (AST_main_token_index!==undefined)
                    throw "EBNF: In rule "+ruleName+" there are more than one ^ modifiers";
                
                previousToken.AST_main_token=true;
                
                AST_main_token_index=index;
                
                foundModifier=true;
            }
            
            if (token.type==="AST_ignore_token"){
                if (previousToken===undefined)
                    throw "EBNF: In rule "+ruleName+" there are a ! modifiers as first token";
                
                previousToken.AST_ignore_token=true;
                
                foundModifier=true;
            }
            
            if (!foundModifier){
                updatedRuleList.push(token);
                previousToken=token;
            }
            
            
        });
        
        this.rules[ruleName]=updatedRuleList;
        
        /*
        if (AST_main_token_index!==undefined){
            this.rules[ruleName].splice(AST_main_token_index,1);
        }*/
    };
    
    /**
     * (Private) Update types of grammar
     * @param {type} ruleName
     * @returns {undefined}
     */
    updateTypes(ruleName){
        var $this=this;
        
        this.rules[ruleName].forEach(function(token){
            if (token.type==="rule" && $this.isToken(token.value))
                token.type="token";
        });
    };
    
    /**
     * (Private) Converts EBNF to BNF
     * @param {string} ruleName
     * @returns {undefined}
     */
    convertToBNF(ruleName){
        var currentRule=[];
        var insideBlock=undefined;
        var insideBlockToken=undefined;
        var insideBlockCount=0;
        
        var $this=this;
        
        //For each token in rule
        this.rules[ruleName].forEach(function(token){
            if (insideBlockCount===0){
                if (token.type==="repetition_start" 
                        || token.type==="optional_start"  
                        || token.type==="grouping_start"){
                    insideBlock=[];
                    insideBlockToken=token.type;
                    insideBlockCount=1;
                }
                else{
                    currentRule.push(token);
                }
            }else{
                
                if (insideBlockToken==="repetition_start"){
                    if (token.type==="repetition_start")
                        insideBlockCount++;
                    else{
                        if (token.type==="repetition_end"){
                            insideBlockCount--;
                            
                            if (insideBlockCount===0){
                                //Create new rule
                                var newRuleName=$this.createRepetitionRule(ruleName,insideBlock);
                                currentRule.push(new Tokenizer.Token("rule",newRuleName));
                            }
                        } 
                        else{
                            insideBlock.push(token);
                        }
                    }
                    
                }else if (insideBlockToken==="optional_start"){
                    if (token.type==="optional_start")
                        insideBlockCount++;
                    else{
                        if (token.type==="optional_end"){
                            insideBlockCount--;
                            
                            if (insideBlockCount===0){
                                //Create new rule
                                var newRuleName=$this.createOptionalRule(ruleName,insideBlock);
                                currentRule.push(new Tokenizer.Token("rule",newRuleName));currentRule.push({type:"rule",value:newRuleName});
                            }
                        } 
                        else{
                            insideBlock.push(token);
                        }
                    }
                    
                }else if (insideBlockToken==="grouping_start"){
                    if (token.type==="grouping_start")
                        insideBlockCount++;
                    else{
                        if (token.type==="grouping_end"){
                            insideBlockCount--;
                            
                            if (insideBlockCount===0){
                                //Create new rule
                                var newRuleName=$this.createGroupingRule(ruleName,insideBlock);
                                currentRule.push(new Tokenizer.Token("rule",newRuleName));
                            }
                        } 
                        else{
                            insideBlock.push(token);
                        }
                    }
                    
                }else{
                    insideBlock.push(token);
                }
            }
             
        });
        
        this.rules[ruleName]=currentRule;
    };
    
    /**
     * Get next index for new BNF rules
     * @returns {Number}
     */
    getNextBnfRuleIndex(){
        if (this.nextBnfRuleIndex===undefined){
            this.nextBnfRuleIndex=0;
            return 0;
        }
        else{
            this.nextBnfRuleIndex++;
            return this.nextBnfRuleIndex-1;
        }
            
    }
    
    /**
     * (Private) Converts Repetition rule to BNF
     * @param {strings} parentRuleName
     * @param {array} tokens
     * @returns {Parser.createRepetitionRule.name|String}
     */
    createRepetitionRule(parentRuleName,tokens){
        var name=parentRuleName+"_repetition_"+this.getNextBnfRuleIndex();
        
        //NOTE: In this position are inserted the provided rules
        
        //Add loop rule
        tokens.push(new Tokenizer.Token("rule",name));
        
        //Add alternation rule
        tokens.push(new Tokenizer.Token("alternation","|"));
        
        
        //Create the new rule
        this.addBnfRule(name,tokens);
        
        //Force conversion to BNF
        this.convertToBNF(name);
        
        return name;
    };
    
    /**
     * (Private) Converts Optional rule to BNF
     * @param {strings} parentRuleName
     * @param {array} tokens
     * @returns {String|Parser.createOptionalRule.name}
     */
    createOptionalRule(parentRuleName,tokens){
        var name=parentRuleName+"_optional_"+Math.round(Math.random()*1000);
        
        //Add grouping
        //tokens.splice(0, 0,new Tokenizer.Token("grouping_start","("));
        
        //NOTE: In this position are inserted the provided rules
        
        //Add grouping
        //tokens.push(new Tokenizer.Token("grouping_end",")"));
        
        //Add alternation rule
        tokens.push(new Tokenizer.Token("alternation","|"));
        
        //Create the new rule
        this.addBnfRule(name,tokens);
        
        //Force conversion to BNF
        this.convertToBNF(name);
        
        return name;
    };
    
    /**
     * (Private) Converts Grouping rule to BNF
     * @param {string} parentRuleName
     * @param {array} tokens
     * @returns {Parser.createGroupingRule.name|String}
     */
    createGroupingRule(parentRuleName,tokens){
        var name=parentRuleName+"_grouping_"+Math.round(Math.random()*1000);
        
        //Create the new rule
        this.addBnfRule(name,tokens);
        
        //Force conversion to BNF
        this.convertToBNF(name);
        
        return name;
    };
    
    /**
     * (Private) Convert alternation to array of options
     * @param {string} ruleName
     * @returns {undefined}
     */
    convertToTreeOfOptions(ruleName){
        var currentPart=[];
        
        var parts=[currentPart];
        
        this.rules[ruleName].forEach(function(token){
            if (token.type!=="alternation"){
                currentPart.push(token);
            }else{
                currentPart=[];
                parts.push(currentPart);
            }
        });
        
        this.rules[ruleName]=parts;
    };
    
    /**
     * Add a Bnf rule
     * @param {string} name
     * @param {arrau} tokens
     * @returns {undefined}
     */
    addBnfRule(name,tokens){
        this.rules[name]=tokens;
        this.BnfExtendedRules.push(name);
    }
    
    /**
     * Returns if a rule is an extension created on BNF conversion
     * @param {string} ruleName
     * @returns {boolean}
     */
    isBnfExtensionRule(ruleName){
        return this.BnfExtendedRules.some(function(ruleName2){
            if (ruleName===ruleName2)
                return true;
        });
    }
    
    /**
     * (Private) Check if a ruleName is a grammar
     * @param {type} name
     * @returns {Boolean}
     */
    isGrammarRule(name){
        return this.rules[name]!==undefined;
    };
    
    /**
     * (Private) Check if a ruleName is a token
     * @param {type} name
     * @returns {Boolean}
     */
    isToken(name){
        return this.tokenizer.tokens[name]!==undefined;
    };
    
    /**
     * (Private) Parse a rule
     * @param {string} ruleName
     * @param {array} tokens
     * @param {int} pos
     * @param {int} deep
     * @returns {ParserTree|undefined}
     */
    checkRule(ruleName,tokens,pos,deep){
        var $this=this;
        
        //For debug only -->
        var deepLogDesp="";
        for(var k=0; k<deep; k++)
            deepLogDesp+="\t";
        
        if (GlobalConfiguration.DebugMode)
            console.log(deepLogDesp+"--> rule",ruleName.blue,"deep",deep,"nextToken",pos,tokens[pos].value);
        //For debug only <--
        
        
        if (tokens[pos]===undefined)
            throw "Unexpected end of file";
        
        //Get the list of options for this rule (alternation)
        var ruleOptions=this.rules[ruleName];
        
        //Initially there are no matches also errors
        var matches=undefined;
        var lastError=undefined;
        
        //Init errorList if no one rule, match
        var errors=[];
            
        
        //Check if match with any rule of the list
        //ruleOptions.some(function(ruleOption){
        for (var ruleOptionIndex=0; ruleOptionIndex<ruleOptions.length; ruleOptionIndex++){
            
            //Get ruleOption
            var ruleOption=ruleOptions[ruleOptionIndex];
            
            //Reset matches to empty array
            matches=[];
            
            //Reset last error
            lastError=undefined;
            
            //Reset item rule position
            var ruleItemPos=0;
            
            //Reset token position
            var tokensPos=pos;
            
            //Is empty rule that accepts anything
            if (ruleOption.length===0){
                //Reset errors, because there is a positive match without maches
                errors=[];
                
                if (GlobalConfiguration.DebugMode)
                    console.log(deepLogDesp+"<--- rule",ruleName.blue,"empty rule deep:"+deep);
                
                break;
            }
            
            //For each Item in the rule
            while (ruleItemPos<ruleOption.length){
                
                //Get the curren rule item
                var ruleItem=ruleOption[ruleItemPos];
                
                //If is a rule, deep inside this rule
                if (ruleItem.type==="rule"){
                    try{
                        if (GlobalConfiguration.DebugMode)
                            console.log(deepLogDesp+"  ? Rule: ".blue,ruleItem.value);
                    
                        //Deep inside a rule
                        var st=$this.checkRule(ruleItem.value,tokens,tokensPos,deep+1);
                        
                        //If exists st, add to matches, otherways (empty rule) continue
                        if (st!==undefined){
                            
                            //Add this tree to matches array
                            matches.push(st);
                            
                            //Update token position and delete from extra data, it won't be necesary again
                            tokensPos=st.extra.nextToken;
                            delete(st.extra.nextToken);
                        }
                        
                        //Go to the next next rule position
                        ruleItemPos++;
                        
                    }catch(err){
                        lastError=err;
                        break;
                    }
                }
                
                //If is a token check it
                if (ruleItem.type==="token"){
                    try{
                        if (GlobalConfiguration.DebugMode)
                            console.log(deepLogDesp+"  ?".blue,ruleItem.value,tokens[tokensPos].value.bgBlack.white,tokens[tokensPos]);
                    }catch(ext){
                        
                    }
                    
                    //If it matches store it and continue
                    if (ruleItem.value===tokens[tokensPos].type){
                        
                        //Add token to matches
                        matches.push(new ParserTreeNodeToken(ruleItem.value,tokens[tokensPos],tokensPos,ruleItem.AST_main_token,ruleItem.AST_ignore_token));
                        
                        //Go to the next rule position and item position
                        tokensPos++;
                        ruleItemPos++;
                    }
                    else{
                        lastError="Unexpected "+tokens[tokensPos].type+" ("+tokens[tokensPos].value+"), expected "+ruleItem.value+" in rule "+ruleName;
                        errors.push(lastError);`` 
                        
                        //Reset matches to empty array
                        matches=[];
                        
                        if (GlobalConfiguration.DebugMode)
                            console.log(deepLogDesp+"    ERR rulePos:",ruleItemPos,"rule length",ruleOption.length,"errors: "+lastError.red);
                        
                        break;
                    }
                    
                    
                }
                
                
                if (GlobalConfiguration.DebugMode)
                    console.log(deepLogDesp+"    OK rulePos:",ruleItemPos,"rule length",ruleOption.length);
                   
            }
            
            
            //If there aren't any error, this rule option match, so exit loop
            if (lastError===undefined){
                //update globa position of token
                pos=tokensPos;
                break;
            }
        };
        
        if (GlobalConfiguration.DebugMode && tokens[pos]!==undefined){
            var printMatches=[];
            matches.forEach(function (t){
                if (t.isToken)
                    printMatches.push(t.token.value+" ("+t.token.type+")");
                else
                    printMatches.push("(st)");
            });
            console.log(deepLogDesp+"<---",ruleName,"matches",printMatches,"deep",deep,"nextToken",pos,tokens[pos].type);
        }
            
        //If some rule match, so return a new tree node
        if (matches.length>0){
            var st=new ParserTreeNodeRule(ruleName,matches,{nextToken:pos});
            if (GlobalConfiguration.DebugMode){
                console.log("*****");
                st.print();
                console.log("*****");
            }
            
            return st;
        }
        else
            if (errors.length>0)
                throw errors;
            else
                return undefined;
    };
    
    /**
     * Parse a string and returns the syntactic tree
     * @param {string} string
     * @returns {ParserTreeNode}
     */
    parseST(string){
        //Extract token list
        var tokens=this.tokenizer.parse(string);
        
        //Add end of file to token list
        //tokens.push(new ParserTreeNodeToken(GlobalConfiguration.EndOfFile,GlobalConfiguration.EndOfFile,0,false));
        tokens.push(new Tokenizer.Token(GlobalConfiguration.EndOfFile,GlobalConfiguration.EndOfFile));
        
        //Execute first rule
        var st=this.checkRule("grammar",tokens,0,0);
        
        //Delete last token of the list (end of file)
        delete(st.children[1]);
        
        return st;
    };
    
    /**
     * Parse a string and returns the abstract syntactic tree
     * @param {string} string
     * @returns {ParserTreeNode}
     */
    parseAST(string){
        //Get syntactic tree
        var st=this.parseST(string);
        
        //Convert to abstract syntactic tree
        return this.AST_extract(st);
    };
    
    /**
     * (Private) Transform ST to AST 
     * @param {ParserTreeNode} st
     * @param {int} deep
     * @returns {ParserTreeNodeAst}
     */
    AST_extract(st,deep){
        if (deep===undefined)
            deep=0;
        
        var desp="";
        for(var k=0; k<deep; k++)
            desp+="  ";
        
        if (this.isBnfExtensionRule(st.ruleName))
            deep--;
        
        
        if (GlobalConfiguration.DebugMode) 
            console.log(desp+"-->",st.ruleName.red,deep);
        
        var left=[];
        var right=[];
        var mainToken=undefined;
        
        if (st.children!==undefined)
            //For each children
            st.children.forEach(function(child){
                child.deep=deep;
                
                //If is token, check if is the main token of the rule
                if (child.isToken){
                    //If is ignore, ignore it
                    if (child.AST_ignore_token){
                        return;
                    }
                    //If is main token rule, store it
                    else if (child.AST_main_token)
                        mainToken=child.token;
                    else{
                        //If not, push on de left and on the right, depending if mainToken has already exist
                        if (mainToken===undefined)
                            left.push(new ParserTreeNodeAst(child.token,[],[],deep));
                        else
                            right.push(new ParserTreeNodeAst(child.token,[],[],deep));
                    }
                }
                //If is a rule push on the left or on the right
                else{
                    var childrenTree=this.AST_extract(child,deep+1);
                        
                    if (childrenTree!==undefined){
                        //If mainToken isn't defined
                        if (mainToken===undefined){
                            
                            //If chldrenTree deep is equal to current deep, so use this tree
                            if (childrenTree.deep===deep){
                                //Use main token
                                mainToken=childrenTree.token;
                                
                                //Add left list to children tree
                                childrenTree.left.forEach(function(item){
                                    left.push(item);
                                });
                                
                                //Set right list from descendant
                                right=childrenTree.right;
                            }
                            else
                                left.push(childrenTree);
                            //left.splice(0,0,childrenTree);
                        }else{
                            if (childrenTree.deep===deep){
                                var newLeft=[];
                                right.forEach(function(item){
                                    newLeft.push(item);
                                });
                                childrenTree.left.forEach(function(item){
                                    newLeft.push(item);
                                });
                                
                                childrenTree.left=newLeft;
                                right=[childrenTree];
                                
                                
                            }else
                                right.push(childrenTree);
                           
                        }
                    }
                }
            },this);
        
        if (GlobalConfiguration.DebugMode) {
            console.log(desp+"<--",st.ruleName.blue);
            
            if(mainToken!==undefined)
                console.log(desp+"main: ".magenta,mainToken.value+"("+mainToken.type+")");
            
            var str="";
            left.forEach(function(item){str+=" "+item.token.value+"("+item.token.type+") - deep: "+item.deep;});
            console.log(desp+"left:".blue,str);
            str="";
            right.forEach(function(item){str+=" "+item.token.value+"("+item.token.type+") - deep: "+item.deep;});
            console.log(desp+"right:".green,str);
        }
        
        //If main token is not defined
        if (mainToken===undefined){
            var mainAst=undefined;
            
            //All is on the left, so find a main AST
            if (left.length>1){
                //Find a new main ast
                left.forEach(function(ast){
                    if (mainAst===undefined || ast.deep<mainAst.deep)
                        mainAst=ast;
                });
                
                var inLeft=true;
                left.forEach(function(ast){
                    if (ast===mainAst)
                        inLeft=false;
                    else{
                        if (inLeft)
                            //mainAst.left.push(ast);
                            mainAst.left.splice(0,0,ast);
                        else
                            mainAst.right.push(ast);
                    }
                });
                
                
                return mainAst;
            }
            else
                return left[0];
        }
        else{
            return new ParserTreeNodeAst(mainToken,left,right,deep);
        }
            
    }
    
    
};


module.exports.GlobalConfiguration=GlobalConfiguration;
module.exports.Parser=Parser;
