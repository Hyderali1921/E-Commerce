const productModel = require("../models/productModel")
const bcrypt = require("bcrypt");
const { uploadFile } = require("../aws/aws");
const {
    isValid,
    isValidFiles,
    isValidRequestBody,
    isValidObjectId,
    isValidSizes,
    validFileRegex,
    stringRegex,
    passwordRegex,
    phoneRegex,
    pincodeRegex,
    emailRegex
} = require("../middleware/validator");

const createProduct = async (req, res) => {
    try {

        let data = req.body
        let { title, description, price, currencyId, currencyFormat, style, availableSizes, installments } = data

        if (!isValidRequestBody(data)) {
            return res
                .status(400)
                .send({ status: false, message: "Plz Enter Some input" });
        }
        if (!isValid(title)) {
            return res
                .status(400)
                .send({ status: false, message: "Plz Enter the valid title" });
        }
        if (!stringRegex.test(title)) {
            return res
                .status(400)
                .send({ status: false, message: "plz enter  the valid title" });
        }

        let checkTitle = await productModel.findOne({ title: title })
        if (checkTitle) {
            return res
                .status(400)
                .send({ status: false, message: "Title is already exist, plz enter new title" });
        }
        if (!isValid(description)) {
            return res
                .status(400)
                .send({ status: false, message: "Plz Enter the valid description" });
        }
        if (!stringRegex.test(description)) {
            return res
                .status(400)
                .send({ status: false, message: "plz enter  the valid description" });
        }
        if (style) {
            if (!isValid(style)) {
                return res
                    .status(400)
                    .send({ status: false, message: "Plz Enter the valid style" });
            }
            if (!stringRegex.test(style)) {
                return res
                    .status(400)
                    .send({ status: false, message: "plz enter  the valid style" });
            }
        }

        if (!price) {
            return res
                .status(400)
                .send({ status: false, message: "plz enter Price of the Product" });
        }

        if (!/^[+]?([0-9]+\.?[0-9]*|\.[0-9]+)$/.test(price)) {
            return res.status(400).send({ status: false, message: `Invalid price` })
        }

        if (!currencyId) {
            return res
                .status(400)
                .send({ status: false, message: "plz enter the currencyId" });
        }

        if (currencyId !== "INR") {
            return res
                .status(400)
                .send({ status: false, message: "currencyId should be in INR" });
        }

        if (!currencyFormat) {
            return res
                .status(400)
                .send({ status: false, message: "plz enter the currencyFormat" });
        }

        if (currencyFormat !== "₹") {
            return res
                .status(400)
                .send({ status: false, message: "currencyFormat should be in ₹" });
        }

        if (!availableSizes) {
            return res
                .status(400)
                .send({ status: false, message: "plz enter Price of the Product" });
        }

        let sizes = availableSizes.toUpperCase().split(",")
        let arr = ["S", "XS", "M", "X", "L", "XXL", "XL"]

        if (sizes.some(x => !arr.includes(x.trim()))) {
            return res.status(400).send({ status: false, message: `available sizes must be in ${arr}` })
        }
        data['availableSizes'] = sizes

        if (installments) {
            if (!/^[0-9]+$/.test(installments)) return res.status(400).send({ status: false, message: `Invalid Installments` })
        }

        let files = req.files;
        if (files && files.length > 0) {
            let uploadProductImage = await uploadFile(files[0]);
            data.productImage = uploadProductImage;
        } else {
            return res
                .status(400)
                .send({ status: false, message: "please upload the profile Image " });
        }

        let productCreated = await productModel.create(data);

        res.status(201).send({
            status: true,
            message: "Product cerated Successfully",
            data: productCreated,
        });
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

//********GET all Product ***************/

const getfilterProduct = async (req, res) => {
    try {
        let data = req.query


        if (!isValidRequestBody(data)) {
            const checkProduct = await productModel.find({ isDeleted: false })
            if (!checkProduct) {
                return res
                    .status(404)
                    .send({ status: false, message: "no Product found" })
            }
            return res
                .status(200)
                .send({ status: true, message: "product found succesfully", data: checkProduct })
        }
        else {
            let name = req.query.name
            let size = req.query.size
            let priceGreaterThan = req.query.priceGreaterThan
            let priceLessThan = req.query.priceLessThan
            let filter = { isDeleted: false }
            if (name) {
                filter.title = { $regex: name, $options: "i" }
            }
            if (priceGreaterThan) {
                if (!/^[+]?([0-9]+\.?[0-9]*|\.[0-9]+)$/.test(priceGreaterThan)) {
                    return res.status(400).send({ status: false, message: `Invalid priceGreaterThan` })
                }
                filter.price = { $gt: `${priceGreaterThan}` }
            }
            if (priceLessThan) {
                if (!/^[+]?([0-9]+\.?[0-9]*|\.[0-9]+)$/.test(priceLessThan)) {
                    return res.status(400).send({ status: false, message: `Invalid priceLessThan` })
                }
                filter.price = { $lt: `${priceLessThan}` }
            }

            if (size) {
                let sizes = size.toUpperCase().split(",")
                let arr = ["S", "XS", "M", "X", "L", "XXL", "XL"]

                if (sizes.some(x => arr.includes(x.trim()))) {
                    filter.size = { $in: `${sizes}` }
                }
                else {
                    return res.status(400).send({ status: false, message: `available sizes must be in ${arr}` })
                }
            }


            if (req.query.priceSort) {
                if (req.query.priceSort != 1 || req.query.priceSort != -1) {
                    return res.status(400).send({ status: false, message: "Use 1 for high or -1 for low" })
                }

            }

            let filteredProduct = await productModel.find({ $and: [filter] }).sort({ price: req.query.priceSort })


            if (filteredProduct.length == 0) {
                return res.status(404).send({ status: false, message: "No such any product found" })
            }

            else {
                return res.status(200).send({ status: true, message: "product found", data: filteredProduct })

            }

        }

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}






//********GET Product ***************/
const getProduct = async function (req, res) {
    try {
        const productId = req.params.productId;
        if (!productId) {
            return res
                .status(400)
                .send({ status: false, message: "plz enter  productId params" });
        }
        if (!isValidObjectId(productId)) {
            return res
                .status(400)
                .send({ status: false, message: "productId is incorrect" });
        }

        const product = await productModel.findOne({ _id: productId });

        if (!product) {
            return res.status(404).send({
                status: false,
                message: `Product not found with this ${productId} id`,
            });
        }
        return res
            .status(200)
            .send({ status: true, message: "user profile details", data: product });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
};


//************PUT or Updated *******************/

const updateProduct = async function (req, res) {
    try {
        let data = req.body;
        let ProductId = req.params.productId

        if (!isValidRequestBody(data)) {
            return res.status(400).send({ status: false, message: "plz input data" });
        }

        if (!ProductId) {
            return res
                .status(400)
                .send({ status: false, message: "plz enter  productId params" });
        }
        if (!isValidObjectId(ProductId)) {
            return res
                .status(400)
                .send({ status: false, message: "productId is incorrect" });
        }

        let { title, description, price, currencyId, currencyFormat, style, availableSizes, productImage, installments } = data;


        if (title) {
            if (!stringRegex.test(title)) {
                return res
                    .status(400)
                    .send({ status: false, message: "plz enter  the valid title" });
            }
            let checkTitle = await productModel.findOne({ title: title })
            if (checkTitle) {
                return res
                    .status(400)
                    .send({ status: false, message: "Title is already exist, plz enter new title" });
            }
        }
        if (description) {
            if (!stringRegex.test(description)) {
                return res
                    .status(400)
                    .send({ status: false, message: "plz enter  the valid lname" });
            }
        }
        if (price) {
            if (!/^[+]?([0-9]+\.?[0-9]*|\.[0-9]+)$/.test(price)) {
                return res.status(400).send({ status: false, message: `Invalid price` })
            }
        }
        if (currencyFormat) {
            if (currencyFormat !== "₹") {
                return res
                    .status(400)
                    .send({ status: false, message: "CurrencyFormat should be in ₹ " });
            }
        }

        if (currencyId) {
            if (currencyId !== "INR") {
                return res
                    .status(400)
                    .send({ status: false, message: "CurrencyId should be in INR" });
            }
        }
        if (style) {
            if (!stringRegex.test(style)) {
                return res
                    .status(400)
                    .send({ status: false, message: "plz enter  the valid style" });
            }
        }

        if (availableSizes) {
            let sizes = availableSizes.toUpperCase().split(",")
            let arr = ["S", "XS", "M", "X", "L", "XXL", "XL"]

            if (sizes.some(x => !arr.includes(x.trim()))) {
                return res.status(400).send({ status: false, message: `available sizes must be in ${arr}` })
            }
            data['availableSizes'] = sizes
        }

        if (req.files) {
            let files = req.files;
            if (files && files.length > 0) {
                let uploadProductImage = await uploadFile(files[0]);
                data.productImage = uploadProductImage;
            }
        }
        if (installments) {
            if (!/^[+]?([0-9]+\.?[0-9]*|\.[0-9]+)$/.test(price)) {
                return res.status(400).send({ status: false, message: `Invalid installments` })
            }
        }
        const updatedProduct = await productModel.findOneAndUpdate(
            { _id: ProductId },
            data,
            { new: true }
        );
        updatedProduct.save();

        return res
            .status(200)
            .send({ status: true, message: "Product updated", data: updatedProduct });

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
};

const deleteProduct = async function (req, res) {

    try {
        let ProductId = req.params.productId

        if (!ProductId) {
            return res
                .status(400)
                .send({ status: false, message: "plz enter  productId params" });
        }
        if (!isValidObjectId(ProductId)) {
            return res
                .status(400)
                .send({ status: false, message: "productId is incorrect" });
        }

        let Product = await productModel.findOne({ _id: ProductId, isDeleted: false })
        if (!Product) { return res.status(404).send({ status: false, message: "Product does not exist in DB" }) }

        let date = new Date()
        let check = await productModel.findOneAndUpdate(
            { _id: ProductId }, { isDeleted: true, deletedAt: date }, { new: true })

        return res.status(200).send({ status: true, message: "Product is Deleted Succesfully", data: check })

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

module.exports = { createProduct, getfilterProduct, getProduct, updateProduct, deleteProduct }