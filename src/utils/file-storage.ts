import * as fs from 'fs';
import * as multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        try {
            fs.mkdirSync('uploads');
        }catch(e) {}

        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        // multer 对 HTTP 请求头中的文件名使用 Latin-1 解码
        // 需要手动转回 UTF-8 才能正确显示中文
        const utf8Name = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + utf8Name;
        cb(null, uniqueName);
    }
});

export { storage };

