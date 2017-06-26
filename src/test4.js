var Tokenizer=require("./Tokenizer.js");
var Parser=require("./Parser.js");

var tokenizer=new Tokenizer.Tokenizer(
    {
        block_start:"{",
        block_end:"}",
        attribute_sep:",",
        attribute_asign:":",
        list_start:"[",
        list_end:"]",
        
        string:Tokenizer.RegularExpressions.String,
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
    grammar:"OBJECT",
    OBJECT:"block_start! CONTENT block_end!",
    CONTENT:"ATTR {attribute_sep^ ATTR}",
    ATTR:"string^ attribute_asign! RVALUE",
    RVALUE:"string | float | int | OBJECT | list_start! RVALUE {attribute_sep^ RVALUE} list_end!"
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
var str='{"a":2,"b":"test","c":[1,2,3,{"m":"mmm"}]}';

console.log("TOKENS:",tokenizer.parse(str));

console.log("------------------");
var ast=parser.parseAST(str);
ast.print();
