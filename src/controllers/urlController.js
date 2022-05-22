const urlModel = require("../Models/urlModel");
const shortId=require("shortid")
// const validUrl=require("valid-url");
const redis = require("redis");
const { promisify } = require("util");
const isValid = function (value) {
    if (typeof value === "undefined" || value === null) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;
    return true;
  };

 
  //Connect to redis
  const redisClient = redis.createClient(
    16772,
    "redis-16772.c264.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
  );
  redisClient.auth("GFWahgVJ6WdpO19O8aWa17EQ0pCpoTCj", function (err) {
    if (err) throw err;
  });
  
  redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
  });
  

  //1. connect to the server
  //2. use the commands :
  
  //Connection setup for redis
  
  const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
  const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const shortenUrl=async function (req,res) {
    try {
        const data=req.body
        let {longUrl}=data
        if (Object.keys(data).length===0) {
            return res.status(400).send({status:false,message:'no data provided'})
        }
        if (!isValid(longUrl)) {
            return res.status(400).send({status:false,message:'longurl is required'})
        }
        longUrl=longUrl.trim()
        if (!(longUrl.includes('//'))) {
            return res.status(400).send({status:false,msg:'Invalid longUrl'})
        }
        const urlParts=longUrl.split('//')
        const scheme=urlParts[0]
        const uri=urlParts[1]


        if (!(uri.includes('.'))) {
            return res.status(400).send({status:false,msg:'Invalid longUrl'})
        }
        const uriParts=uri.split('.')
        if (!((scheme==='http:' || scheme==='https:') && (uriParts[0].trim().length) && (uriParts[1].trim().length))) {
            return res.status(400).send({status:false,msg:'Invalid longUrl'}) 
        }

        // if (!validUrl.isWebUri(longUrl)) {
        //     return res.status(400).send({status:false,message:'please provide a valid url'})
        // }

        let cachedData = await GET_ASYNC(`${longUrl}`)
        console.log(cachedData)
        if (cachedData) { 
            let obj=JSON.parse(cachedData)
            // console.log(obj)
            console.log("Data from cache!!")
            return res.status(200).send({ status: true,message:'already shortUrl created', data:{urlCode:obj.urlCode,longUrl:obj.longUrl,shortUrl:obj.shortUrl}}) 
           }

        const checkUrl=await urlModel.findOne({longUrl:longUrl}).select({_id:0,__v:0})
        if(checkUrl){
            console.log('data from DB')
            return res.status(200).send({status:true,message:'from DB',data:checkUrl})
        }    
        
        const urlCode=shortId.generate().toLowerCase()
        const shortUrl="http://localhost:3000/" + urlCode
        data['shortUrl']=shortUrl
        data['urlCode']=urlCode
    
        const createdData=await urlModel.create(data)
        // await SET_ASYNC(`${longUrl}`, JSON.stringify(createdData))
        redisClient.set(`${longUrl}`, JSON.stringify(createdData),function (err,reply) {
            if(err) throw err;
            redisClient.expire(`${longUrl}`, 20, function (err, reply) {
              if(err) throw err;
              console.log(reply); 
            });
        })
        console.log('data created in mongoDb server')
        return res.status(201).send({status:true,data:createdData})
    } catch (error) {
        return res.status(500).send({status:false,message:error.message})
    }
    
}

const getUrl=async function (req,res) {
    try {
        const urlCode=req.params.urlCode
        if (Object.keys(urlCode)==0) { 
            return res.status(400).send({status:false,message:'please provide url code in params'})
        }
        let cahcedProfileData = await GET_ASYNC(`${urlCode}`)
      
        if(cahcedProfileData) {
            // console.log(`cache data:${cahcedProfileData}`)
            console.log('cache data')
            console.log('==========')
            return res.status(302).redirect(JSON.parse(cahcedProfileData))
        }
        const url=await urlModel.findOne({urlCode:urlCode})
        if(!url){
            return res.status(404).send({status:false,message:'no url found with this code,please check input and try again'})
        }
        //

        redisClient.set(`${urlCode}`, JSON.stringify(url.longUrl),function (err,reply) {
            if(err) throw err;
            redisClient.expire(`${urlCode}`, 20, function (err, reply) {
              if(err) throw err;
              console.log(reply);
            });
        })
        console.log('quering from MongoDB server')
        console.log('==========')
        return res.status(302).redirect(url.longUrl)

    } catch (error) {
        return res.status(500).send({status:false,message:error.message})
    }
}


module.exports={shortenUrl,getUrl};
