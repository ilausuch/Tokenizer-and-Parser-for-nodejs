var Tokenizer=require("./Tokenizer.js");
var Parser=require("./Parser.js");

var tokenizer=new Tokenizer.Tokenizer(
    {
        if:"if",
        else:"else",
        
        block_start:"{",
        block_end:"}",
        par_start:"(",
        par_end:")",
        
        comparator:["==",">","<",">=","<=","!="],
        connector:["and","or"],
        assig:"=",
        mathOp:["+","-","*","/"],
        
        sentence_sep:";",
        
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

Parser.GlobalConfiguration.DebugMode=true;


var parser=new Parser.Parser({
    grammar:"IFT",
    PROGRAM:"SENTENCE {sentence_sep SENTENCE}",
    SENTENCE:"IF | ASSIG |",
    IFT:"if^ par_start! COND par_end!",
    IF:"if^ par_start COND par_end block_start PROGRAM block_end [else block_start PROGRAM block_end]",
    COND: "id comparator^ VALUE",
    ASSIG: "id assig^ MATH_SENTENCE",
    MATH_SENTENCE: "RVALUE [mathOp^ MATH_SENTENCE]",
    RVALUE: "par_start^ MATH_SENTENCE par_end | MATH_VALUE",
    MATH_VALUE:"int | float | id",
    VALUE: "MATH_SENTENCE | string"
},
tokenizer);

var rules=parser.rules;
for (var ruleName in rules){
    console.log("-->",ruleName);
    console.log(rules[ruleName]);
};

console.log("------------------");

//var str="if (a==1) {b=4;} else {};";
//var str="a=1*m+(3+(4-b));if (a==4*m) {b=4;c=4}";
var str="if (a==4*m)";

console.log("TOKENS:",tokenizer.parse(str));

console.log("------------------");
var ast=parser.parseAST(str);
ast.print();
