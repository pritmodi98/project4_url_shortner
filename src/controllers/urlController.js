const urlModel = require("../Models/urlModel");
const shortId=require("shortid")
const validUrl=require("valid-url")
const isValid = function (value) {
    if (typeof value === "undefined" || value === null) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;
    return true;
  };

const shortenUrl=async function (req,res) {
    try {
        const data=req.body
        const {longUrl}=data
        if (Object.keys(data).length===0) {
            return res.status(400).send({status:false,message:'no data provided'})
        }
        if (!isValid(longUrl)) {
            return res.status(400).send({status:false,message:'longurl is required'})
        }
        if (!validUrl.isUri(longUrl)) {
            return res.status(400).send({status:false,message:'please provide a valid url'})
        }
        const checkUrl=await urlModel.findOne({longUrl:longUrl})
        if(checkUrl){
            return res.status(400).send({status:false,message:'this url already exist'})
        }    
        
        const urlCode=shortId.generate()
        const shortUrl="http://localhost:3000/" + urlCode
        data['shortUrl']=shortUrl
        data['urlCode']=urlCode
    
        const createdData=await urlModel.create(data)
        return res.status(201).send({status:true,data:createdData})
    } catch (error) {
        return res.status(500).send({status:false,message:error.message})
    }
    
}

const getUrl=async function (req,res) {
    try {
        
    } catch (error) {
        return res.status(500).send({status:false,message:error.message})
    }
}

module.exports={shortenUrl,getUrl};