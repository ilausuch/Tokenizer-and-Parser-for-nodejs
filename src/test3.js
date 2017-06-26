var Tokenizer=require("./Tokenizer.js");
var Parser=require("./Parser.js");

var tokenizer=new Tokenizer.Tokenizer(
    {
        comparator:["=","gt"],
        connector:["and","or"],
        coma:",",
        bar:"/",
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

//Parser.GlobalConfiguration.DebugMode=true;


var parser=new Parser.Parser({
    grammar:"LIST",
    LIST:"EXPAND {coma^ EXPAND}",
    EXPAND: "id {bar^ id}"
},
tokenizer);

var rules=parser.rules;
for (var ruleName in rules){
    console.log("-->",ruleName);
    console.log(rules[ruleName]);
};

console.log("------------------");

var str="Purchase/Product/Info,User/Info,Country/Province/City,Shop";
///var str="1";

console.log("TOKENS:",tokenizer.parse(str));

console.log("------------------");
var st=parser.parseST(str);
st.print();

console.log("------------------");

var ast=parser.parseAST(str);
ast.print();
