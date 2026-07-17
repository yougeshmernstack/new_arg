

const HtmlPage = require('../MODALS/HtmlPage');
const { errorLogger } = require('../utils/logger');

class HtmlPages {
async Create_page(req, res) {
    const { title, content } = req.body;
    try {
        
        const newPage = new HtmlPage({ title, content });
        await newPage.save();
        return  res.status(200).json({ success: true, data: newPage });
    } catch (error) {
            errorLogger(error)
        return  res.status(500).json({ success: false, message: error.message });
    }
}

// Get an HTML page by ID
async Get_page(req,res){
    const  {title}  = req.query;
    try {

        const page = await HtmlPage.findOne({title});
        if (!page) {
            
            return res.status(404).json({ success: false, message: 'Page not found' });
        }
        res.setHeader('Content-Type', 'text/html');
  
        // Send the HTML content
        return res.status(200).send(page.content);
    } catch (error) {
            errorLogger(error)
        console.log(error)
        return res.status(500).json({ success: false, message: "internal server eroor" });
    }
};

// Update an HTML page by ID
async Update_page(req, res){
    const { id, title, content } = req.body;
    try {
       
        const updatedPage = await HtmlPage.findOneAndUpdate({id:id}, { title, content }, { new: true });
        if (!updatedPage) {
            return res.status(404).json({ success: false, message: 'Page not found' });
        }
        return res.status(200).json({ success: true, data: updatedPage });
    } catch (error) {
            errorLogger(error)
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Delete an HTML page by ID
async Delete_page(req, res) {
    const { id } = req.body;
    try {
        const deletedPage = await HtmlPage.findOneAndDelete({id:id});
        if (!deletedPage) {
            return res.status(404).json({ success: false, message: 'Page not found' });
        }
        return res.status(200).json({ success: true, data: deletedPage });
    } catch (error) {
            errorLogger(error)
        return res.status(500).json({ success: false, message: "internal server error" });
    }
};
}
const Html_Page = new HtmlPages();
module.exports = Html_Page;
