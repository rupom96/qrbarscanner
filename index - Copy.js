
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// mssql config
const sql = require("mssql/msnodesqlv8");
var config = {
    server: "118.67.215.152",
    database: "test3",
    user: "sa",
    password: "dbz@123#",
    options: {
        trustedConnection: false
    }
}

//qr
const Jimp = require("jimp");
const qrCode = require('qrcode-reader');

const { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } = require('@zxing/library');
const jpeg = require('jpeg-js');
const { MongoClient, ServerApiVersion } = require('mongodb');
const tesseract = require("node-tesseract-ocr");

const javascriptBarcodeReader = require('javascript-barcode-reader');
const Quagga = require('quagga').default;

var fs = require('fs');
const imageToBase64 = require('image-to-base64');
var path = require('path');
const { Storage } = require('@google-cloud/storage');
var stream = require('stream');
require('dotenv').config();

const app = express();


app.use(cors());
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb' }));
// app.use(express.bodyParser({ limit: '50mb' }));
// app.use(bodyParser.json({ limit: '100mb' }));
// app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));

//socket.io
const http = require("http");
const { Server } = require('socket.io');
const server = http.createServer(app);
const socketio = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    }

})
server.listen(3001, () => {
    console.log("Socket.io server is running");
})



const port = process.env.PORT || 6600;




// Imports the Google Cloud client library.
const vision = require('@google-cloud/vision');
const CREDENTIALS = JSON.parse(process.env.VISION_AI_SERVICE);

const CONFIG = {
    credentials: {
        private_key: CREDENTIALS.private_key,
        client_email: CREDENTIALS.client_email
    }
};

const client = new vision.ImageAnnotatorClient(CONFIG);

const productClient = new vision.ProductSearchClient(CONFIG);

const gcs = new Storage({
    // keyFilename: path.join(__dirname, "/deft-striker-serviceMailKey.json"),
    // keyFilename: process.env.VISION_AI_SERVICE,
    credentials: {
        private_key: CREDENTIALS.private_key,
        client_email: CREDENTIALS.client_email
    },
    project_id: CREDENTIALS.project_id
});

// gcs.getBuckets().then(x => console.log(x));




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gxrbr.mongodb.net/?retryWrites=true&w=majority`;
const mongoclient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// mongoclient.connect(err => {
//     const collection = mongoclient.db("test").collection("devices");
//     // perform actions on the collection object
//     console.log("hitting the mongodb");
//     mongoclient.close();
// });





//create product set.............................
async function createProductSet() {
    /**
     * TODO(developer): Uncomment the following line before running the sample.
     */
    const projectId = CREDENTIALS.project_id;
    const location = `${process.env.VISION_LOCATION}`;
    const productSetId = `${process.env.PROD_SET_ID}`;
    const productSetDisplayName = 'databizonline_prodset';

    // Resource path that represents Google Cloud Platform location.
    const locationPath = productClient.locationPath(projectId, location);

    const productSet = {
        displayName: productSetDisplayName,
    };

    const request = {
        parent: locationPath,
        productSet: productSet,
        productSetId: productSetId,
    };

    const [createdProductSet] = await productClient.createProductSet(request);
    console.log(`Product Set name: ${createdProductSet.name}`);
}
// createProductSet();




//mongoDb functions
async function run() {
    try {
        await mongoclient.connect();

        console.log('db connected');

        const database = mongoclient.db("DataBiz");
        const tokensCollection = database.collection('tokens');


        //GET all tokens API
        // app.get('/tokens', async (req, res) => {
        //     const cursor = tokensCollection.find({});
        //     const tokens = await cursor.toArray();
        //     res.send(tokens);
        // });
        //GET single token API
        app.post('/tokens', async (req, res) => {
            const tokennum = req.body.tokennum;
            // const id = 123456;
            console.log('getting specific token', tokennum);
            const query = { token: tokennum };
            const single = await tokensCollection.findOne(query);
            res.json(single);
        })

        //insert single token API
        app.post('/tokensInsert', async (req, res) => {
            const tokennum = req.body.tokennum;
            const flag = req.body.flag;
            // const token = req.body;
            const token = { token: tokennum, flag: flag }
            console.log('hit the post api', token);

            const result = await tokensCollection.insertOne(token);
            console.log(result);
            res.json(result);
        });

        //delete single bike/product
        app.post('/tokensDlt', async (req, res) => {
            const tokennum = req.body.tokennum;
            const query = { token: tokennum };
            const result = await tokensCollection.deleteOne(query);
            console.log('deleting product with id', result);
            res.json(result);
        });


        //update flag value of a single token
        app.post('/tokensUpdate', async (req, res) => {
            const tokennum = req.body.tokennum;
            const flag = req.body.flag;
            console.log('updating tokenFLag', tokennum)
            const query = { token: tokennum };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    flag: flag
                },
            };
            const result = await tokensCollection.updateOne(query, updateDoc, options);
            console.log('flag set to true', result);

            res.json(result);
        });

    }
    finally {
        // await mongoclient.close();
    }
}
// run().catch(console.dir);





//--------------Listing all products in a product set----------------
async function listProductsInProductSet() {
    /**
     * TODO(developer): Uncomment the following line before running the sample.
     */
    const projectId = CREDENTIALS.project_id;
    const location = `${process.env.VISION_LOCATION}`;
    const productSetId = `${process.env.PROD_SET_ID}`;
    const productSetPath = productClient.productSetPath(
        projectId,
        location,
        productSetId
    );
    const getAllListReq = {
        name: productSetPath,
    };
    var allProdList = [];
    const [products] = await productClient.listProductsInProductSet(getAllListReq);
    products.forEach(product => {

        const singleProdDetails = {
            Pname: product.displayName,
            Pid: product.name.split('/').pop(-1)
        };
        allProdList.push(singleProdDetails);

    });
    console.log(allProdList);
}
// listProductsInProductSet();


//------------Listing reference images----------------
async function listReferenceImage() {
    /**
     * TODO(developer): Uncomment the following line before running the sample.
     */
    const projectId = CREDENTIALS.project_id;
    const location = `${process.env.VISION_LOCATION}`;
    const productId = '283299';
    const formattedParent = productClient.productPath(projectId, location, productId);
    const request = {
        parent: formattedParent,
    };
    //https://storage.cloud.google.com/${process.env.BUCKET_NAME}/bottle21.JPEG
    var imgsOfProd = [];
    const [response] = await productClient.listReferenceImages(request);
    response.forEach(image => {
        var perImg = {
            imgName: image.name.split('/').pop(-1),
            imgURL: `https://storage.cloud.google.com/${process.env.BUCKET_NAME}/${image.uri.split('/').pop(-1)}`
        };
        imgsOfProd.push(perImg);
    });
    console.log(imgsOfProd);
}
// listReferenceImage();

//YOU ALSO NEED TO DELETE THAT IMAGE FROM BUCKET............!!!!!!!!!!!! IMAGE DELETE AAR PRODUCT THEKE REF IMG DELETE ER CODE EK FUNCTION ER MODDHE HOBE!!!



//------------Delete a Reference Image from training set and bucket--------------
async function deleteReferenceImage() {
    /**
     * TODO(developer): Uncomment the following line before running the sample.
     */
    const projectId = CREDENTIALS.project_id;
    const location = `${process.env.VISION_LOCATION}`;
    const productId = '0';
    const referenceImageId = '0_1';
    const fileName = `${referenceImageId}.jpg`;

    const bucketName = `${process.env.BUCKET_NAME}`;

    const formattedName = productClient.referenceImagePath(
        projectId,
        location,
        productId,
        referenceImageId
    );

    const request = {
        name: formattedName,
    };

    await productClient.deleteReferenceImage(request);
    console.log('Reference image deleted from product.');
    //DELETING THAT IMAGE FROM BUCKET
    await gcs.bucket(bucketName).file(fileName).delete();
    console.log(`gs://${bucketName}/${fileName} deleted`);

}
// deleteReferenceImage();









//-----------------------Deleting a product---------------------------
async function deleteProduct() {
    /**
     * TODO(developer): Uncomment the following line before running the sample.
     */
    const projectId = CREDENTIALS.project_id;
    const location = `${process.env.VISION_LOCATION}`;
    const productId = '283299';

    // Resource path that represents full path to the product.
    const productPath = productClient.productPath(projectId, location, productId);

    await productClient.deleteProduct({ name: productPath });
    console.log('Product deleted.');
}
// deleteProduct();


//deleting a file from source project
var filePathTemp = 'tempPic1.jpg';
// fs.unlinkSync(filePathTemp);







app.get('/', (req, res) => {
    res.send('Hello World node js.. atlast rupom yo yo!');
});

app.get('/vision', (req, res) => {

    const img_path = req.query.path;

    if (img_path) {
        const detailsOfImg = async (path_img) => {
            const request = {
                // image: {
                //     content: path_img
                // },
                image: {
                    source: {
                        filename: path_img,
                        // imageUri: path_img,
                    },
                },
                features: [
                    {
                        maxResults: 01,
                        type: "LANDMARK_DETECTION"
                    },
                    {
                        maxResults: 10,
                        type: "OBJECT_LOCALIZATION"
                    },
                    {
                        maxResults: 01,
                        type: "TEXT_DETECTION"
                    },
                    {
                        maxResults: 01,
                        type: "LOGO_DETECTION"
                    },
                    {
                        maxResults: 01,
                        type: "LABEL_DETECTION"
                    },
                    {
                        maxResults: 03,
                        type: "FACE_DETECTION"
                    },
                ]
            };

            const [resultNew] = await client.annotateImage(request);
            console.log(resultNew);

            const imgDetails = [
                {
                    object: resultNew?.localizedObjectAnnotations[0]?.name,
                    text: (resultNew?.fullTextAnnotation?.text)?.replace("\n", " "),
                    brand: resultNew?.logoAnnotations[0]?.description,
                    landName: resultNew?.landmarkAnnotations[0]?.description
                }
            ]
            console.log(imgDetails);
            res.send(imgDetails);
        }
        detailsOfImg(img_path);
    }
    else {
        res.send("vision");
    }
});








async function dataBaseConnect() {
    try {
        await mongoclient.connect();

        console.log('db connected');

        const database = mongoclient.db("DataBiz");
        const tokensCollection = database.collection('tokens');

        // MOBILE VISION POST API.................................

        app.post('/visionphone', (req, res) => {

            const img_path = req.body.pic;
            const tokenid = req.body.tokenid;
            console.log("dhukse vision post e");

            const detailsOfImg = async (path_img) => {

                var barqrCodeRes;
                var ocrRes;

                //QR & Bar reader..................................................(zxing :D the best)
                const buffer = Buffer.from(path_img, "base64");

                try {
                    const rawImageData = jpeg.decode(buffer);
                    const hints = new Map();
                    const formats = [BarcodeFormat.DATA_MATRIX];
                    // const formats = [BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE];

                    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
                    hints.set(DecodeHintType.TRY_HARDER, true);
                    const reader = new MultiFormatReader();
                    reader.setHints(hints);
                    const len = rawImageData.width * rawImageData.height;
                    const luminancesUint8Array = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        luminancesUint8Array[i] = ((rawImageData.data[i * 4] + rawImageData.data[i * 4 + 1] * 2 + rawImageData.data[i * 4 + 2]) / 4) & 0xFF;
                    }
                    const luminanceSource = new RGBLuminanceSource(luminancesUint8Array, rawImageData.width, rawImageData.height);
                    // console.log(luminanceSource);
                    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
                    const decoded = reader.decode(binaryBitmap);
                    console.log(decoded.text);
                    barqrCodeRes = decoded.text;

                }
                catch (err) {
                    barqrCodeRes = 'unstable/blurry/invalid Bar, cant read';

                }
                console.log("qr&bar shesh");

                //OCR Code........................................................
                const tessaractImg = buffer;
                const config = {
                    lang: "eng",
                    oem: 1,
                    psm: 3,
                }

                tesseract
                    .recognize(tessaractImg, config)
                    .then((text) => {
                        // console.log("Result:", text)
                        // console.log("done");
                        ocrRes = text;
                        var imgResObj = [
                            { barqr: barqrCodeRes, ocr: ocrRes }
                        ]
                        console.log(imgResObj);
                        // res.send(imgResObj);
                    })
                    .catch((error) => {
                        console.log(error.message);
                        ocrRes = error.message;
                        var imgResObj = [
                            { barqr: barqrCodeRes, ocr: ocrRes }
                        ];
                        console.log(imgResObj);
                        // res.send(imgResObj);
                    })
                    .finally(async () => {
                        var imgResObj = [
                            { barqr: barqrCodeRes, ocr: ocrRes }
                        ];


                        // const flag = req.body.flag;
                        console.log('updating tokenFLag', tokenid)
                        const query = { token: tokenid };
                        const options = { upsert: true };
                        const updateDoc = {
                            $set: {
                                imgdata: imgResObj
                            },
                        };
                        const result = await tokensCollection.updateOne(query, updateDoc, options);
                        console.log("result of upsert" + result);
                        res.send(imgResObj);
                        // res.send(imgResObj);
                    })
            }

            detailsOfImg(img_path);
        });

        //GET datas token API
        app.post('/getPhoneImageData', async (req, res) => {
            const tokennum = req.body.tokenid;
            // const id = 123456;
            console.log('getting specific token', tokennum);
            const query = { token: tokennum };
            const datas = tokensCollection.find({ token: "1234" });
            console.log("database get result");
            // console.log(datas);
            var temp = await datas.toArray();
            console.log(temp);

            // var rupom = temp;
            var rupom = [{ barqr: temp[0].imgdata[0].barqr, ocr: temp[0].imgdata[0].ocr }]
            res.json(rupom);
        });




    }
    catch (e) {
        console.log(e);
    }
}
dataBaseConnect().catch(console.dir);

app.post('/vision', (req, res) => {

    const img_path = req.body.pic;

    console.log("dhukse vision post e");

    const detailsOfImg = async (path_img) => {

        var barqrCodeRes;
        var ocrRes;

        //QR & Bar reader..................................................(zxing :D the best)
        const buffer = Buffer.from(path_img, "base64");

        try {
            const rawImageData = jpeg.decode(buffer);
            const hints = new Map();
            const formats = [BarcodeFormat.DATA_MATRIX];
            // const formats = [BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE];

            hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
            hints.set(DecodeHintType.TRY_HARDER, true);
            const reader = new MultiFormatReader();
            reader.setHints(hints);
            const len = rawImageData.width * rawImageData.height;
            const luminancesUint8Array = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                luminancesUint8Array[i] = ((rawImageData.data[i * 4] + rawImageData.data[i * 4 + 1] * 2 + rawImageData.data[i * 4 + 2]) / 4) & 0xFF;
            }
            const luminanceSource = new RGBLuminanceSource(luminancesUint8Array, rawImageData.width, rawImageData.height);
            // console.log(luminanceSource);
            const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
            const decoded = reader.decode(binaryBitmap);
            console.log(decoded.text);
            barqrCodeRes = decoded.text;

        }
        catch (err) {
            barqrCodeRes = 'unstable/blurry/invalid Bar, cant read';

        }
        console.log("qr&bar shesh");

        //OCR Code........................................................
        const tessaractImg = buffer;
        const config = {
            lang: "eng",
            oem: 1,
            psm: 3,
        }

        tesseract
            .recognize(tessaractImg, config)
            .then((text) => {
                // console.log("Result:", text)
                // console.log("done");
                ocrRes = text;
                var imgResObj = [
                    { barqr: barqrCodeRes, ocr: ocrRes }
                ]
                console.log(imgResObj);
                res.send(imgResObj);
            })
            .catch((error) => {
                console.log(error.message);
                ocrRes = error.message;
                var imgResObj = [
                    { barqr: barqrCodeRes, ocr: ocrRes }
                ];
                console.log(imgResObj);
                res.send(imgResObj);
            })
    }

    detailsOfImg(img_path);
});




app.post('/qrscan', (req, res) => {

    const img_path = req.body.pic;
    console.log("dhukse qrScan post e");

    const detailsOfImg = async (path_img) => {

        var barqrCodeRes;
        var ocrRes;

        //QR & Bar reader..................................................(zxing :D the best)
        const buffer = Buffer.from(path_img, "base64");

        try {
            const rawImageData = jpeg.decode(buffer);
            const hints = new Map();
            const formats = [BarcodeFormat.DATA_MATRIX];
            // const formats = [BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE];

            hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
            hints.set(DecodeHintType.TRY_HARDER, true);
            const reader = new MultiFormatReader();
            reader.setHints(hints);
            const len = rawImageData.width * rawImageData.height;
            const luminancesUint8Array = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                luminancesUint8Array[i] = ((rawImageData.data[i * 4] + rawImageData.data[i * 4 + 1] * 2 + rawImageData.data[i * 4 + 2]) / 4) & 0xFF;
            }
            const luminanceSource = new RGBLuminanceSource(luminancesUint8Array, rawImageData.width, rawImageData.height);
            // console.log(luminanceSource);
            const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
            const decoded = reader.decode(binaryBitmap);
            console.log(decoded.text);
            barqrCodeRes = decoded.text;

            var imgResObj = [
                { barqr: barqrCodeRes, ocr: ocrRes }
            ]
            console.log(imgResObj);
            res.send(imgResObj);


        }
        catch (err) {
            barqrCodeRes = 'unstable/blurry/invalid Bar, cant read';
            var imgResObj = [
                { barqr: barqrCodeRes, ocr: ocrRes }
            ]
            console.log(imgResObj);
            res.send(imgResObj);

        }
        console.log("qr&bar shesh");
    }

    detailsOfImg(img_path);
});






app.post('/savePhoto', (req, res) => {

    try {
        const img_path = req.body.pic;
        const token = req.body.token;
        // photo = img_path;

        const buffer = Buffer.from(img_path, "base64");
        fs.writeFileSync(`${token}.jpg`, buffer);
        // var filePath = 'tempPic1.jpg';
        const imgDetails = [
            {
                res: "success"
            }
        ]
        console.log(`image saved for ${token}`)
        res.send(imgDetails);
    }
    catch (e) {
        const imgDetails = [
            {
                res: `${e}`
            }
        ]
        console.log(`image couldn't saved for ${token}`)
        res.send(imgDetails);
    }


})

app.post('/getPhoto', (req, res) => {

    const img_name = req.body.picname;
    console.log(img_name);
    var fullImg_name = `${img_name}.jpg`;

    try {

        imageToBase64(fullImg_name) // Path to the image
            .then((response) => {


                const imgDetails = [
                    {
                        photob64: response
                    }
                ]

                res.send(imgDetails);
                // console.log(response); // "cGF0aC90by9maWxlLmpwZw=="
            }
            )
            .catch((error) => {
                // console.log(error); // Logs an error if there was one
                const imgDetails = [
                    {
                        photob64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII="
                    }]
                console.log(imgDetails.photob64);
                res.send(imgDetails);

            }
            )
    }
    catch (e) {

        const imgDetails = [
            {
                photob64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII="
            }]
        console.log(imgDetails.photob64);
        res.send(imgDetails);

    }

})

app.post('/removeFoundPic', (req, res) => {

    const img_name = req.body.picname;
    console.log(img_name);
    var fullImg_name = `${img_name}.jpg`;
    try {
        fs.unlinkSync(fullImg_name);
        console.log("image deleted");
    }
    catch (e) {

    }
})

socketio.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("rupom", (data) => {
        console.log(data.message);
        console.log(data.room);
        socket.to(1234).emit("rupom", data.message)
    });

    socket.on("join_room", (data) => {
        socket.join(data);
        console.log("joined room" + data);
    })

    socket.emit("rupom2", { message: "yoyorupom2" })

})


//mssql codes for scanner product search

sql.connect(config, function (err) {
    if (err) {
        console.log(err);
    }

    var request = new sql.Request();
    request.query("Select * from Product where Product.Name like '%KONKA%'", function (err, records) {
        if (err) {
            console.log(err);
        }
        else {
            console.log(records);
            console.log(records.recordset);
        }
    })


})


app.listen(port, () => {
    console.log(`listening on port`, port);
})
