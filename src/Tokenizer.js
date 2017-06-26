/*!
 * Tokenizer
 * Copyright(c) 2017 Ivan Lausuch
 * MIT Licensed
 */

'use strict'

/**
 * Standard regular expressions 
 **/
const RegularExpressions={
    Identifier:/[a-zA-Z_][a-zA-Z0-9_]*/mi,
    Integer:/[0-9][0-9]*/mi,
    Number:/([0-9]+(\.[0-9]+)?|\.[0-9]+)/mi,
    Float:/([0-9]+(\.[0-9]+)|\.[0-9]+)/mi,
    String:/("(\\"|[^"])*"|'(\\'|[^'])*')/mi,
    Whitespace:/\s/mi
};

/**
 * Token class
 */
class Token{
  constructor(type,value,index){
      this.type=type;
      this.value=value;
      this.index=index;
  }
};



/**
 * Tokenizer class
 * Lexer parser
 */
class Tokenizer{
    
    constructor(tokens,config){
        this.tokens=tokens;
        this.config=config;
        
        this.checkConfiguration();
    }
    
    checkConfiguration(){
        var $this=this;
        
        if (this.tokens===undefined || typeof this.tokens!=="object")
            throw "Tokenizer: requires a config.tokens be an object";
        
        for (var k in this.tokens){
            var token=this.tokens[k];
            
            if (typeof token === 'string' || token instanceof String)
                this.tokens[k]=new RegExp(this.prepareString(token),"mi");
            else
                if (Array.isArray(token)){
                    this.tokens[k]=[];
                    token.forEach(function(tokenItem){
                        if (typeof tokenItem === 'string' || tokenItem instanceof String)
                            $this.tokens[k].push(new RegExp(this.prepareString(tokenItem),"mi"));
                        else
                            if (tokenItem instanceof RegExp)
                                $this.tokens[k].push(tokenItem);
                            else
                                throw "Tokenizer: In token "+k+"="+token+" all elements must be regular expression, or strings"; 
                            
                    },this);
                }
                else
                    if (!(token instanceof RegExp))
                        throw "Tokenizer: Token "+k+"="+token+" is not a regular expression, an string or an array of string"; 
        }
        
        if (this.config!==undefined && this.config.ignoredTokens!==undefined){
            if (!Array.isArray(this.config.ignoredTokens))
                throw "Tokenizer: ignoredTokens must be an array"; 
            
            this.config.ignoredTokens.forEach(function(token){
                if (!(typeof token === 'string' || token instanceof String))
                    throw "Tokenizer: Token "+token+" in ignoredTokens must be a string"; 
            });
        }
    };
    
    parse(str){
        
        var list=[];
        
        var pos=0;
        var str2=str;
        
        //While there are something pendent to anlyze 
        while(str2.length>0){
            var currentMatch=undefined;
            
            //Check for each token if match
            for (var token in this.tokens){
                var regExp=this.tokens[token];
                var match=null;
                
                //If this is a regular expression
                if (regExp instanceof RegExp){
                    match=regExp.exec(str2);
                    
                    //If match check if this is nearest token
                    if (match!==null){
                        if (currentMatch===undefined || match.index<currentMatch.index)
                            currentMatch=new Token(token,match[0],match.index);
                    }
                //It is an array of regular expressions
                }else{
                    //For each one check
                    regExp.forEach(function(regExpItem){
                        var match=regExpItem.exec(str2);
                        if (match!==null){
                            if (currentMatch===undefined || match.index<currentMatch.index)
                                currentMatch=new Token(token,match[0],match.index);
                        }
                    });
                }
            }
            
            if (currentMatch.index!==0){
                throw "Tokenizer: invalid character '"+str2[0]+"' at '"+str2.substring(0,10)+"'..."
            }
            
            //If neither token has match break the loop
            if (currentMatch===undefined)
                break;
            
            //Calc pendent string
            str2=str2.substring(currentMatch.index+currentMatch.value.length);
            
            //If it isn't a ignored token add to the list
            if (!this.isIgnoredToken(currentMatch.type))
                list.push(currentMatch);
        }
        
        return list;
        
    };
    
    isIgnoredToken(token){
        if (this.config.ignoredTokens===undefined)
            return false;
        
        return this.config.ignoredTokens.some(function(ignored){
            if (token===ignored)
                return true;
        });
    };
  
    prepareString(str){
        return str
                .replace("\\","\\\\")
                .replace("(","\\(").replace(")","\\)")
                .replace("[","\\[").replace("]","\\]")
                .replace("{","\\{").replace("}","\\}")
                .replace("*","\\*").replace("+","\\+")
                .replace("?","\\?").replace("^","\\^")
                .replace("$","\\$").replace("|","\\|")
                .replace(".","\\.")
        ;
    }
};


module.exports.Token=Token;
module.exports.Tokenizer=Tokenizer;
module.exports.RegularExpressions=RegularExpressions;