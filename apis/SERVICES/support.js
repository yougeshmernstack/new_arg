const Ticket = require('../MODALS/supportTicket');
const UserData = require('../MODALS/userData');
// const Notification = require('../MODALS/notifications');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const advance_info = require('../MODALS/advanceInfo');
const { broadcast } = require('../webSocket/broadCast');

class SUPPORT {
    async createTicket(req, res) {
        try {
            const { uid } = req.user;
            const { subject, description } = req.body;

            // Map file information to get the URLs
            const attachmentUrls = req.files.map(file =>
                `${req.protocol}://${req.get('host')}/${file.filename}${path.extname(file.originalname)}`
            );

            const newTicket = new Ticket({
                ticketId: uuidv4(),
                uid,
                subject,
                description,
                attachments: attachmentUrls // Save URLs of the uploaded files
            });

            await newTicket.save();
            res.status(201).json({ message: 'Ticket created successfully', ticket: newTicket });
        } catch (error) {
            res.status(500).json({ error: 'Error creating ticket' });
        }
    }
    async getTicketTypes(req, res) {
        try {
            const info = await advance_info.findOne();
            if (info && info.support_ticket_types) {
                console.log("Support Ticket Types:", info.support_ticket_types);
                res.status(200).json(info.support_ticket_types);
            } else {
                res.status(404).json({ error: 'No support ticket types found' });
            }
        } catch (error) {
            console.error("Error fetching ticket types:", error);
            res.status(500).json({ error: 'Error fetching tickets' });
        }
    };

    // new with filter
    async getUserTickets(req, res) {
        try {
            const { uid } = req.user; // Extract user ID from the request
            const { ticketId } = req.query; // Extract optional ticketId from query parameters
    
            const filters = { uid: uid };
            if (ticketId) filters.ticketId = ticketId;
    
            const tickets = await Ticket.find(filters); // Query the database with filters
            broadcast({ ticketId: ticketId, data: tickets });

            res.status(200).json(tickets); 
        } catch (error) {
            res.status(500).json({ error: 'Error fetching tickets' }); // Handle errors
        }
    };
    
    async getTicketById(req, res) {
        try {
            // const ticket = await Ticket.findOne({ ticketId: req.params.id, uid: req.user.uid });
            const ticket = await Ticket.findOne({ ticketId: req.query.ticketId });
            if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
            broadcast({ ticketId: req.query.ticketId, data: ticket });
            res.status(200).json(ticket);
        } catch (error) {
            res.status(500).json({ error: 'Error fetching ticket' });
        }
    };


    async addComment(req, res) {
        try {
            // const ticket = await Ticket.findOne({ ticketId: req.params.id });
            const ticket = await Ticket.findOne({ ticketId: req.body.ticketId });
            if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

            const comment = {
                commentId: uuidv4(),
                user_type: 'user',
                uid: req.user.uid,
                message: req.body.message
            };
            ticket.comments.push(comment);
            ticket.updated_at = new Date();
            const ticketdata=await ticket.save();
            
            broadcast({ ticketId: req.body.ticketId, data: comment });

            res.status(200).json({ message: 'Comment added successfully', ticket });
        } catch (error) {
            res.status(500).json({ error: 'Error adding comment' });
        }
    };

    async getAllTickets(req, res) {
        try {
            const { ticketId, status, priority, page = 1, limit = 10, startDate, endDate } = req.query;
    
            // Parse pagination parameters
            const pageNumber = parseInt(page, 10);
            const pageSize = parseInt(limit, 10);
    
            // Filters for the query
            const filters = {};
            if (ticketId) filters.ticketId = ticketId;
            if (status) filters.status = new RegExp(`^${status}$`, 'i');
            if (priority) filters.priority = new RegExp(`^${priority}$`, 'i');
    
            // Date filtering
            if (startDate || endDate) {
                filters.created_at = {};
                if (startDate) {
                    const start = new Date(startDate);
                    start.setUTCHours(0, 0, 0, 0); // Set time to the beginning of the day
                    filters.created_at.$gte = start;
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setUTCHours(23, 59, 59, 999); // Set time to the end of the day
                    filters.created_at.$lte = end;
                }
            }
    
            // Fetch tickets
            const tickets = await Ticket.find(filters)
                .skip((pageNumber - 1) * pageSize) // Skip documents
                .limit(pageSize); // Limit number of documents
    
            // Get the total count of documents matching the filters
            const totalDocuments = await Ticket.countDocuments(filters);
    
            // Fetch user details for each ticket
            const ticketsWithUserDetails = await Promise.all(tickets.map(async (ticket) => {
                const user = await UserData.findOne({uid:ticket.uid}).select('name username'); // Query userdata for name and username
                return {
                    ...ticket.toObject(),
                    name: user?.name,
                    username: user?.username
                };
            }));
    
            // Calculate total pages
            const totalPages = Math.ceil(totalDocuments / pageSize);
    
            // Return paginated response with user details
            res.status(200).json({
                tickets: ticketsWithUserDetails,
                totalDocuments,
                totalPages,
                currentPage: pageNumber,
                pageSize,
            });
        } catch (error) {
            res.status(500).json({ error: 'Error fetching tickets' });
        }
    }

    // Update ticket details (status, priority, assigned_to)
    async updateTicket(req, res) {
        try {
            const { status, priority } = req.body;
            // const ticket = await Ticket.findOne({ ticketId: req.params.id });
            const ticket = await Ticket.findOne({ ticketId: req.query.ticketId });
            console.log(ticket);
            if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

            if (status) ticket.status = status;
            if (priority) ticket.priority = priority;
            // if (assigned_to) ticket.assigned_to = assigned_to;
            ticket.updated_at = new Date();
            await ticket.save();

            res.status(200).json({ message: 'Ticket updated successfully', ticket });
        } catch (error) {
            res.status(500).json({ error: 'Error updating ticket' });
        }
    };

    // Admin responds to a ticket
    async adminAddComment(req, res) {
        try {
            // const ticket = await Ticket.findOne({ ticketId: req.params.id });
            const ticket = await Ticket.findOne({ ticketId: req.body.ticketId });
            if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

            const comment = {
                commentId: uuidv4(),
                user_type: 'admin',
                uid: req.user.uid, // Assuming admin's ID here
                message: req.body.message
            };
            ticket.comments.push(comment);
            ticket.updated_at = new Date();
           const ticketdata= await ticket.save();

            // **Broadcast to only the clients connected to this ticket**
        broadcast({ ticketId: req.body.ticketId, data: comment });

            res.status(200).json({ message: 'Admin comment added successfully', ticket });
        } catch (error) {
            res.status(500).json({ error: 'Error adding comment' });
        }
    };

  
}

const support = new SUPPORT();
module.exports = support;


// Admin functions here...
