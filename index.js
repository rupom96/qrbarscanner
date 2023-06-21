
const express = require('express');
const cors = require('cors');

const { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } = require('@zxing/library');
const jpeg = require('jpeg-js');

require('dotenv').config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb' }));
// app.use(express.bodyParser({ limit: '50mb' }));
// app.use(bodyParser.json({ limit: '100mb' }));
// app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));

const port = process.env.PORT || 6600;

app.get('/', (req, res) => {
    res.send('Hello World node js.. atlast rupom yo yo!');
});


app.get('/rupom', (req, res) => {
    res.send('Hello RUPOM node js.. atlast rupom yo yo!');
});


//for PC
app.post('/vision', (req, res) => {

    const img_path = req.body.pic;
    console.log("dhukse vision post e");

    const detailsOfImg = async (path_img) => {

        var barqrCodeRes;
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

            console.log('success' + barqrCodeRes);

        }
        catch (err) {
            barqrCodeRes = 'unstable/blurry/invalid Bar, cant read';
            console.log('failed' + barqrCodeRes);
        }
        finally {

            console.log("qr&bar shesh");
            console.log(barqrCodeRes);
            let imgresult =
                { barqr: barqrCodeRes };

            res.send(imgresult);
        }
    }
    detailsOfImg(img_path);
});

app.listen(port, () => {
    console.log(`listening on port`, port);
})
