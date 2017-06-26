/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var Tokenizer=require("./Tokenizer.js");
var Parser=require("./Parser.js");


console.log("----------------");
console.log("----------------");
console.log("----------------");
try{
    var tokenizer=new Tokenizer.Tokenizer(
        {
            comparator:["=","gt"],
            connector:["and","or"],
            coma:[","],
            string:Tokenizer.RegularExpressions.String,
            id:Tokenizer.RegularExpressions.Identifier,
            float:Tokenizer.RegularExpressions.Float,
            int:Tokenizer.RegularExpressions.Integer,
            sp:Tokenizer.RegularExpressions.Whitespace
        },
        {
            ignoredTokens:["sp"]
        }
    );
    var str="a=1 and b=2.2 ";
    
    console.log(tokenizer.parse(str));
    return;
    
    //Parser.GlobalConfiguration.DebugMode=true;
    
    var parser=new Parser.Parser({
        grammar:"RIGHT",
        RIGHT:"COMP {connector^ RIGHT}",
        COMP:"id comparator^ RVALUE",
        RVALUE:"int | float | string"
    },
    tokenizer);
    
    console.log("----------------");
    var rules=parser.rules;
    for (var ruleName in rules){
        console.log("-->",ruleName);
        console.log(rules[ruleName]);
    };
    console.log("----------------");
    
    //var tokens=tokenizer.parse(str);
    
    console.log("----------------");
    var st=parser.parseST(str);
    st.print();
    
    console.log("----------------");
    var ast=parser.parseAST(str);
    ast.print();
    
    
}catch(err){
    console.log("ERROR "+err+" -> ");
    console.log(err.stack);
}
