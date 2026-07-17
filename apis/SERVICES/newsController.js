const News = require('../MODALS/News');
const { INTERNAL_SERVER_ERROR } = require('../utils/errorMessages');
const { errorLogger } = require('../utils/logger');
// const { addNewsSchema, updateNewsSchema } = require('../validators/newsValidator');

class NEWS{
    // Add News
// async addNews(req, res, next){
//     try {
//         const {id:lastNews} = await News.findOne().sort({date:-1})
//        const id=lastNews+1||1
//         // Handle image upload if present
//         let imageUrl = '';
//         if (req.file) {
//             imageUrl = `${req.protocol}://${req.hostname}/${req?.file?.filename}`; // Assuming the server is serving static files from the uploads folder
//         }

//         const newsData = { ...req.body, image: imageUrl,id };
//         const news = new News(newsData);
//          await news.save();
//         res.status(200).json({ message: 'News added successfully'});
//     } catch (error) {
//         errorLogger(error);
//         res.status(500).json({...INTERNAL_SERVER_ERROR});
//     }
// };

async addNews(req, res, next) {
    try {
        const {title,description, popup, news_section} = req.body
        console.log(req.body);
        if (!title || !description) {
          return  res.status(400).json({message:'all feilds are required.'})
        }
        // Attempt to find the last news item, sorted by date in descending order
        const lastNews = await News.findOne().sort({ date: -1 });
        // Set the id to 1 if lastNews is null, otherwise increment the lastNews id by 1
        const id = lastNews ? lastNews.id + 1 : 1;

        // Handle image upload if present
        let imageUrl = '';
        if (req.file) {
            imageUrl = `${req.protocol}://${req.hostname}/${req.file.filename}`; // Assuming the server is serving static files from the uploads folder
        }

        // Create news data with the incremented id and other request body data
        const newsData = {title,description, image: imageUrl, id, popup, news_section};
        const news = new News(newsData);

        // Save the new news item
        await news.save();
        res.status(200).json({ message: 'News added successfully' });
    } catch (error) {
        // Log error and send a server error response
        errorLogger(error);
        res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
}


// Update News
async updateNewsSettings(req, res) {
    try {
        const { id, fields } = req.body;

        // Ensure `fields` is an object
        if (!id || !fields || typeof fields !== 'object') {
            return res.status(400).json({ message: 'ID and fields are required.' });
        }

        // Validate that the fields contain only the allowed keys
        const allowedFields = ['news_section', 'popup', 'dashboard'];
        const invalidFields = Object.keys(fields).filter(field => !allowedFields.includes(field));
        
        if (invalidFields.length > 0) {
            return res.status(400).json({ message: `Invalid fields specified: ${invalidFields.join(', ')}` });
        }

        const news = await News.findOne({ id });
        if (!news) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Set each field specified in the `fields` object to the given value
        Object.keys(fields).forEach(field => {
            news[field] = fields[field];  // Set the field to the exact value provided
        });

        // Save the updated news item
        await news.save();
        res.status(200).json({ message: 'News settings updated successfully', data: news });
    } catch (error) {
        errorLogger(error);
        res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
}

// Delete News
 async deleteNews (req, res, next){
    // console.log("request_data",req.body);
    try {
        const news = await News.findOneAndDelete({id:req.body.id});
        if (!news) return res.status(404).json({ message: 'News not found' });
        res.json({ message: 'News deleted successfully' });
    } catch (error) {
        errorLogger(error);
        res.status(500).json({...INTERNAL_SERVER_ERROR});
    }
};

// Get All News
async getAllNews(req, res, next) {
    try {
        const { page = 1, limit = 10, sort = 'date', order = 'desc', title, startDate, endDate, status } = req.query;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (title) filter.title = { $regex: title, $options: 'i' }; // Case-insensitive title search
        if (status) filter.status = status; // Filter by status
        if (startDate && endDate) filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) }; // Date range filter

        // Fetch news with filters, sorting, and pagination
        const newsList = await News.find(filter)
            .sort({ [sort]: order === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({ message: 'News retrieved successfully', data: newsList });
    } catch (error) {
        errorLogger(error);
        res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
}

}
module.exports = new NEWS();
