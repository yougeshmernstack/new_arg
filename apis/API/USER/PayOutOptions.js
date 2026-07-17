const UserPaymentOption = require("../../MODALS/UserPaymentOption");
const UserData = require("../../MODALS/userData");
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");

class USER_PAYMENT {
    // async addBankDetail(req, res) {
    //     try {
    //         const { uid } = req.user; // Assume uid is in req.user
    //         const { bankName, accountNumber, ifsc, holder, ac_type, branch } = req.body;

    //         if (!bankName || !accountNumber || !ifsc) {
    //             return res.status(400).json({ ...INVALID_REQUEST, message: 'Missing required bank details.' });
    //         }

    //         let paymentOptions = await UserPaymentOption.findOne({ uid });

    //         if (!paymentOptions) {
    //             paymentOptions = new UserPaymentOption({ uid });
    //         }

    //         paymentOptions.bank.push({
    //             bankName,
    //             accountNumber,
    //             ifsc,
    //             holder,
    //             ac_type,
    //             branch,
    //             status: 0 // Default to inactive
    //         });

    //         await paymentOptions.save();

    //         res.status(200).json({ message: 'Bank detail added successfully.' });
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }

    // new for add bank
    async addBankDetail(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user
            const { bankName, accountNumber, ifsc, holder, ac_type, branch } = req.body;

            if (!bankName || !accountNumber || !ifsc) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Missing required bank details.' });
            }

            let paymentOptions = await UserPaymentOption.findOne({ uid });

            if (!paymentOptions) {
                paymentOptions = new UserPaymentOption({ uid });
            }

            // Check if no other details have a default set
            const hasNoDefaults = !paymentOptions.bank.some(bank => bank.status === 1) &&
                !paymentOptions.upi.some(upi => upi.status === 1) &&
                !paymentOptions.web3.some(web3 => web3.status === 1);

            // Add the new bank detail
            paymentOptions.bank.push({
                bankName,
                accountNumber,
                ifsc,
                holder,
                ac_type,
                branch,
                status: hasNoDefaults ? 1 : 0 // Set as default if no defaults exist
            });

            await paymentOptions.save();

            res.status(200).json({ message: 'Bank detail added successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    async getBankDetails(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user

            // Fetch the user's payment options, including bank details
            const paymentOptions = await UserPaymentOption.findOne({ uid });

            // If no payment options found, respond with an appropriate message
            if (!paymentOptions || !paymentOptions.bank || paymentOptions.bank.length === 0) {
                return res.status(404).json({ message: 'No bank details found for this user.' });
            }

            // Return the bank details
            res.status(200).json({ bankDetails: paymentOptions.bank });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    // for admin
    async getBankDetailsForAdmin(req, res) {
    try {
        const { uid, role } = req.user; // Logged-in user's role & ID
        const { page = 1, limit = 10, search } = req.query;

        const query = {};

        // ✅ Non-admin users can only see their own details
        if (role !== 'admin' && role !== 'manager') {
            query.uid = uid;
        } else {
            // ✅ Admin can search by username, name, or UID
            if (search) {
                const userSearchRegex = new RegExp(search, 'i');
                const matchingUsers = await UserData.find({
                    $or: [
                        { username: userSearchRegex },
                        { name: userSearchRegex },
                        { uid: isNaN(search) ? -1 : parseInt(search) } // handle numeric UID
                    ]
                }, 'uid');
                const matchingUserIds = matchingUsers.map(u => u.uid);
                query.uid = { $in: matchingUserIds };
            }
        }

        // ✅ Fetch bank details from UserPaymentOption collection
        const bankDetails = await UserPaymentOption.find(query)
            .sort({ uid: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        if (!bankDetails || bankDetails.length === 0) {
            return res.status(404).json({ message: 'No bank details found.' });
        }

        // ✅ Include user info (name, username, email) for admin view
        const detailsWithUserInfo = await Promise.all(
            bankDetails.map(async (item) => {
                const userInfo = await UserData.findOne(
                    { uid: item.uid },
                    'uid username name email'
                );

                return {
                    uid: item.uid,
                    username: userInfo?.username || null,
                    name: userInfo?.name || null,
                    email: userInfo?.email || null,
                    bank: item.bank || [],
                    upi: item.upi || [],
                };
            })
        );

        // ✅ Total count for pagination
        const totalCount = await UserPaymentOption.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: detailsWithUserInfo,
            totalRecords: totalCount,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
        });

    } catch (error) {
        console.error('Error fetching bank details:', error);
        res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
}

    // Edit bank and UPI details for admin
    async editBankAndUPIDetailsForAdmin(req, res) {
        try {
            const { role } = req.user; // Logged-in user's role
            
            // ✅ Only admin and manager can edit
            if (role !== 'admin' && role !== 'manager') {
                return res.status(403).json({ message: 'Access denied. Only admin and manager can edit payment details.' });
            }

            const { uid, oldAccountNumber, accountNumber, ifsc, holder, bankName, ac_type, branch, oldUpiId, upiId } = req.body;

            if (!uid) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'User UID is required.' });
            }

            // Find the payment options for the target user
            const paymentOptions = await UserPaymentOption.findOne({ uid });
            
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found for this user.' });
            }

            let updatedBank = false;
            let updatedUPI = false;
            const messages = [];

            // Edit Bank Details (if bank fields are provided)
            if (oldAccountNumber) {
                // Find the bank record to update
                const bankIndex = paymentOptions.bank.findIndex(bank => bank.accountNumber === oldAccountNumber);
                
                if (bankIndex === -1) {
                    return res.status(404).json({ message: 'Bank account not found.' });
                }

                // Update bank details (only update provided fields)
                if (accountNumber) paymentOptions.bank[bankIndex].accountNumber = accountNumber;
                if (ifsc) paymentOptions.bank[bankIndex].ifsc = ifsc;
                if (holder) paymentOptions.bank[bankIndex].holder = holder;
                if (bankName) paymentOptions.bank[bankIndex].bankName = bankName;
                if (ac_type) paymentOptions.bank[bankIndex].ac_type = ac_type;
                if (branch) paymentOptions.bank[bankIndex].branch = branch;

                updatedBank = true;
                messages.push('Bank details updated successfully.');
            }

            // Edit UPI Details (if UPI fields are provided)
            if (oldUpiId) {
                // Find the UPI record to update
                const upiIndex = paymentOptions.upi.findIndex(upi => upi.upiId === oldUpiId);
                
                if (upiIndex === -1) {
                    return res.status(404).json({ message: 'UPI record not found.' });
                }

                // Update UPI details - if image is uploaded, use the filename, otherwise use provided upiId
                if (req.file && req.file.filename) {
                    // Image uploaded, store the filename in upiId
                    paymentOptions.upi[upiIndex].upiId = req.file.filename;
                } else if (upiId) {
                    // No image uploaded, but upiId provided in body, use that
                    paymentOptions.upi[upiIndex].upiId = upiId;
                }

                updatedUPI = true;
                messages.push('UPI details updated successfully.');
            }

            // Check if at least one update was requested
            if (!updatedBank && !updatedUPI) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Please provide either bank details (oldAccountNumber) or UPI details (oldUpiId) to update.' });
            }

            // Save changes
            await paymentOptions.save();

            // Return success message
            const message = messages.length > 0 ? messages.join(' ') : 'Details updated successfully.';
            return res.status(200).json({ 
                message,
                updated: {
                    bank: updatedBank,
                    upi: updatedUPI
                }
            });

        } catch (error) {
            errorLogger(error);
            console.error('Error editing payment details:', error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async deleteBankDetail(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user
            const { accountNumber } = req.body;

            if (!accountNumber) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Account number is required.' });
            }

            const paymentOptions = await UserPaymentOption.findOne({ uid });
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }
            // console.log(paymentOptions.bank,'before delete');
            paymentOptions.bank = paymentOptions.bank.filter(bank => {
                // console.log(bank.accountNumber,accountNumber);
                return bank.accountNumber != accountNumber
            });
            // console.log(paymentOptions.bank,'after delete');

            await paymentOptions.save();

            res.status(200).json({ message: 'Bank detail deleted successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    // async setDefaultBankDetail(req, res) {
    //     try {
    //         const { uid } = req.user; // Assume uid is in req.user
    //         const { accountNumber } = req.body;

    //         if (!accountNumber) {
    //             return res.status(400).json({ ...INVALID_REQUEST, message: 'Account number is required.' });
    //         }

    //         const paymentOptions = await UserPaymentOption.findOne({ uid });
    //         if (!paymentOptions) {
    //             return res.status(404).json({ message: 'Payment options not found.' });
    //         }

    //         paymentOptions.bank.forEach(bank => {
    //             bank.status = bank.accountNumber === accountNumber ? 1 : 0;
    //         });

    //         await paymentOptions.save();

    //         res.status(200).json({ message: 'Default bank detail set successfully.' });
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }

    // async addUPIDetail(req, res) {
    //     try {
    //         const { uid } = req.user; // Assume uid is in req.user
    //         const { name, upiId } = req.body;

    //         if (!name || !upiId) {
    //             return res.status(400).json({ ...INVALID_REQUEST, message: 'Missing required UPI details.' });
    //         }

    //         let paymentOptions = await UserPaymentOption.findOne({ uid });

    //         if (!paymentOptions) {
    //             paymentOptions = new UserPaymentOption({ uid });
    //         }

    //         paymentOptions.upi.push({
    //             name,
    //             upiId,
    //             status: 0 // Default to inactive
    //         });

    //         await paymentOptions.save();

    //         res.status(200).json({ message: 'UPI detail added successfully.' });
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }


    // new for add upi 
    async addUPIDetail(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user
            const { name, upiId } = req.body;

            if (!name || !upiId) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Missing required UPI details.' });
            }

            let paymentOptions = await UserPaymentOption.findOne({ uid });

            if (!paymentOptions) {
                paymentOptions = new UserPaymentOption({ uid });
            }

            // Check if no other details have a default set
            const hasNoDefaults = !paymentOptions.bank.some(bank => bank.status === 1) &&
                !paymentOptions.upi.some(upi => upi.status === 1) &&
                !paymentOptions.web3.some(web3 => web3.status === 1);

            // Add the new UPI detail
            paymentOptions.upi.push({
                name,
                upiId,
                status: hasNoDefaults ? 1 : 0 // Set as default if no defaults exist
            });

            await paymentOptions.save();

            res.status(200).json({ message: 'UPI detail added successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    async getUPIDetails(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user

            // Fetch the user's payment options, including UPI details
            const paymentOptions = await UserPaymentOption.findOne({ uid });

            // If no payment options found or UPI details are empty, respond with an appropriate message
            if (!paymentOptions || !paymentOptions.upi || paymentOptions.upi.length === 0) {
                return res.status(404).json({ message: 'No UPI details found for this user.' });
            }

            // Return the UPI details
            res.status(200).json({ upiDetails: paymentOptions.upi });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    async deleteUPIDetail(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user
            const { upiId } = req.body;

            if (!upiId) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'UPI ID is required.' });
            }

            const paymentOptions = await UserPaymentOption.findOne({ uid });
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            paymentOptions.upi = paymentOptions.upi.filter(upi => upi.upiId !== upiId);

            await paymentOptions.save();

            res.status(200).json({ message: 'UPI detail deleted successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    // async setDefaultUPIDetail(req, res) {
    //     try {
    //         const { uid } = req.user; // Assume uid is in req.user
    //         const { upiId } = req.body;

    //         if (!upiId) {
    //             return res.status(400).json({ ...INVALID_REQUEST, message: 'UPI ID is required.' });
    //         }

    //         const paymentOptions = await UserPaymentOption.findOne({ uid });
    //         if (!paymentOptions) {
    //             return res.status(404).json({ message: 'Payment options not found.' });
    //         }

    //         paymentOptions.upi.forEach(upi => {
    //             upi.status = upi.upiId === upiId ? 1 : 0;
    //         });

    //         await paymentOptions.save();

    //         res.status(200).json({ message: 'Default UPI detail set successfully.' });
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }

    // async addWeb3Detail(req, res) {
    //     try {
    //         const { uid } = req.user; // Assume uid is in req.user
    //         const { chain, address } = req.body;

    //         if (!chain || !address) {
    //             return res.status(400).json({ ...INVALID_REQUEST, message: 'Missing required Web3 details.' });
    //         }

    //         let paymentOptions = await UserPaymentOption.findOne({ uid });

    //         if (!paymentOptions) {
    //             paymentOptions = new UserPaymentOption({ uid });
    //         }

    //         paymentOptions.web3.push({
    //             chain,
    //             address,
    //             status: 0 // Default to inactive
    //         });

    //         await paymentOptions.save();

    //         res.status(200).json({ message: 'Web3 detail added successfully.' });
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }

    // new for add web3
    // async addWeb3Detail(req, res) {
    //     try {
    //         const { uid } = req.user; // Assume uid is in req.user
    //         const { address } = req.body;

    //         if (!address) {
    //             return res.status(400).json({ ...INVALID_REQUEST, message: 'Missing required Web3 details.' });
    //         }

    //         let paymentOptions = await UserPaymentOption.findOne({ uid });

    //         if (!paymentOptions) {
    //             paymentOptions = new UserPaymentOption({ uid });
    //         }

    //         // Check if no other details have a default set
    //         const hasNoDefaults = !paymentOptions.bank.some(bank => bank.status === 1) &&
    //             !paymentOptions.upi.some(upi => upi.status === 1) &&
    //             !paymentOptions.web3.some(web3 => web3.status === 1);

    //         // Add the new Web3 detail
    //         paymentOptions.web3.push({
    //             chain: 56,
    //             address,
    //             status: hasNoDefaults ? 1 : 0 // Set as default if no defaults exist
    //         });

    //         await paymentOptions.save();

    //         res.status(200).json({ message: 'Web3 detail added successfully.' });
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }

    async addWeb3Detail(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user
            const { address } = req.body;

            if (!address) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Missing required Web3 details.' });
            }

            let paymentOptions = await UserPaymentOption.findOne({ uid });

            
            if (!paymentOptions) {
                paymentOptions = new UserPaymentOption({ uid });
            }
            
            if(paymentOptions.web3.length >= 1) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Web3 address already exists.' });
            }

            // Check if no other details have a default set
            const hasNoDefaults = !paymentOptions.bank.some(bank => bank.status === 1) &&
                !paymentOptions.upi.some(upi => upi.status === 1) &&
                !paymentOptions.web3.some(web3 => web3.status === 1);

            // Add the new Web3 detail
            paymentOptions.web3.push({
                chain: 56,
                address,
                status: hasNoDefaults ? 1 : 0 // Set as default if no defaults exist
            });

            await paymentOptions.save();

            res.status(200).json({ message: 'Web3 detail added successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    async getWeb3Details(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user

            // Fetch the user's payment options, including Web3 details
            const paymentOptions = await UserPaymentOption.findOne({ uid });

            // If no payment options found or Web3 details are empty, respond with an appropriate message
            if (!paymentOptions || !paymentOptions.web3 || paymentOptions.web3.length === 0) {
                return res.status(404).json({ message: 'No Web3 details found for this user.' });
            }

            // Return the Web3 details
            res.status(200).json({ web3Details: paymentOptions.web3 });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    async deleteWeb3Detail(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user
            const { address } = req.body;

            if (!address) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Address is required.' });
            }

            const paymentOptions = await UserPaymentOption.findOne({ uid });
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            paymentOptions.web3 = paymentOptions.web3.filter(chain => chain.address !== address);

            await paymentOptions.save();

            res.status(200).json({ message: 'Web3 detail deleted successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    // async setDefaultWeb3Detail(req, res) {
    //     try {
    //         const { uid } = req.user; // Assume uid is in req.user
    //         const { address } = req.body;

    //         if (!address) {
    //             return res.status(400).json({ ...INVALID_REQUEST, message: 'Address is required.' });
    //         }

    //         const paymentOptions = await UserPaymentOption.findOne({ uid });
    //         if (!paymentOptions) {
    //             return res.status(404).json({ message: 'Payment options not found.' });
    //         }

    //         paymentOptions.web3.forEach(web3 => {
    //             web3.status = web3.address === address ? 1 : 0;
    //         });

    //         await paymentOptions.save();

    //         res.status(200).json({ message: 'Default Web3 detail set successfully.' });
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }



    async getUserPaymentOptions(req, res) {
        try {
            const { uid } = req.user; // Extract user ID from authenticated user
            const { page = 1, limit = 10, search, startDate, endDate, type } = req.query;

            // Query to fetch only the current user's data
            const query = { uid };

            // Fetch the user's payment options based on the query
            const paymentOptions = await UserPaymentOption.findOne(query);

            // Handle case when no payment options are found
            if (!paymentOptions) {
                return res.status(404).json({ success: false, message: 'No payment details found.' });
            }

            // Separate the bank, UPI, and Web3 details
            let bankDetails = paymentOptions.bank || [];
            let upiDetails = paymentOptions.upi || [];
            let web3Details = paymentOptions.web3 || [];

            // Create a combined array with type-specific labels
            let combinedDetails = [];

            if (type === 'bank') {
                combinedDetails = bankDetails.map(item => ({ bank: item }));
            } else if (type === 'upi') {
                combinedDetails = upiDetails.map(item => ({ upi: item }));
            } else if (type === 'web3') {
                combinedDetails = web3Details.map(item => ({ web3: item }));
            } else {
                combinedDetails = [
                    ...bankDetails.map(item => ({ bank: item })),
                    ...upiDetails.map(item => ({ upi: item })),
                    ...web3Details.map(item => ({ web3: item }))
                ];
            }

            // Apply date range and search filtering
            const filterDetails = (details) => {
                if (startDate || endDate) {
                    const start = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : null;
                    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;
                    details = details.filter(item => {
                        const itemDate = new Date(item.createdAt || item._id.getTimestamp());
                        return (!start || itemDate >= start) && (!end || itemDate <= end);
                    });
                }

                if (search) {
                    const searchRegex = new RegExp(search, 'i');
                    details = details.filter(item =>
                        Object.values(item).some(value => searchRegex.test(String(value)))
                    );
                }

                return details;
            };

            // Filter the selected type of details
            combinedDetails = filterDetails(combinedDetails);

            // Paginate the results
            const startIndex = (page - 1) * limit;
            const paginatedData = combinedDetails.slice(startIndex, startIndex + parseInt(limit));

            // Prepare the response
            res.status(200).json({
                success: true,
                data: paginatedData,
                totalRecords: combinedDetails.length,
                currentPage: parseInt(page),
                totalPages: Math.ceil(combinedDetails.length / limit),
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: error.message });
        }
    }






    // old one for set default bank, UPI and web3

    // Set Default Bank Detail
    // async setDefaultBankDetail(req, res) {
    //     try {
    //         const { uid } = req.user; // Assume uid is in req.user
    //         const { accountNumber } = req.body;

    //         if (!accountNumber) {
    //             return res.status(400).json({ ...INVALID_REQUEST, message: 'Account number is required.' });
    //         }

    //         const paymentOptions = await UserPaymentOption.findOne({ uid });
    //         if (!paymentOptions) {
    //             return res.status(404).json({ message: 'Payment options not found.' });
    //         }

    //         // Check if a default is already set in UPI or Web3
    //         const hasDefault = paymentOptions.upi.some(upi => upi.status === 1) || 
    //                         paymentOptions.web3.some(web3 => web3.status === 1);
    //         if (hasDefault) {
    //             return res.status(400).json({ message: 'Only one default payment option can be set. A UPI or Web3 default already exists.' });
    //         }

    //         // Set default bank detail
    //         paymentOptions.bank.forEach(bank => {
    //             bank.status = bank.accountNumber === accountNumber ? 1 : 0;
    //         });

    //         await paymentOptions.save();

    //         res.status(200).json({ message: 'Default bank detail set successfully.' });
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }

    // Set Default UPI Detail
    // async setDefaultUPIDetail(req, res) {
    //     try {
    //         const { uid } = req.user; // Assume uid is in req.user
    //         const { upiId } = req.body;

    //         if (!upiId) {
    //             return res.status(400).json({ ...INVALID_REQUEST, message: 'UPI ID is required.' });
    //         }

    //         const paymentOptions = await UserPaymentOption.findOne({ uid });
    //         if (!paymentOptions) {
    //             return res.status(404).json({ message: 'Payment options not found.' });
    //         }

    //         // Check if a default is already set in Bank or Web3
    //         const hasDefault = paymentOptions.bank.some(bank => bank.status === 1) || 
    //                         paymentOptions.web3.some(web3 => web3.status === 1);
    //         if (hasDefault) {
    //             return res.status(400).json({ message: 'Only one default payment option can be set. A Bank or Web3 default already exists.' });
    //         }

    //         // Set default UPI detail
    //         paymentOptions.upi.forEach(upi => {
    //             upi.status = upi.upiId === upiId ? 1 : 0;
    //         });

    //         await paymentOptions.save();

    //         res.status(200).json({ message: 'Default UPI detail set successfully.' });
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }

    // Set Default Web3 Detail
    // async setDefaultWeb3Detail(req, res) {
    //     try {
    //         const { uid } = req.user; // Assume uid is in req.user
    //         const { address } = req.body;

    //         if (!address) {
    //             return res.status(400).json({ ...INVALID_REQUEST, message: 'Address is required.' });
    //         }

    //         const paymentOptions = await UserPaymentOption.findOne({ uid });
    //         if (!paymentOptions) {
    //             return res.status(404).json({ message: 'Payment options not found.' });
    //         }

    //         // Check if a default is already set in Bank or UPI
    //         const hasDefault = paymentOptions.bank.some(bank => bank.status === 1) || 
    //                         paymentOptions.upi.some(upi => upi.status === 1);
    //         if (hasDefault) {
    //             return res.status(400).json({ message: 'Only one default payment option can be set. A Bank or UPI default already exists.' });
    //         }

    //         // Set default Web3 detail
    //         paymentOptions.web3.forEach(web3 => {
    //             web3.status = web3.address === address ? 1 : 0;
    //         });

    //         await paymentOptions.save();

    //         res.status(200).json({ message: 'Default Web3 detail set successfully.' });
    //     } catch (error) {
    //         errorLogger(error);
    //         console.error(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }



    // new one for set default bank, UPI and web3
    // Set Default Bank Detail
    async setDefaultBankDetail(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user
            const { accountNumber } = req.body;

            if (!accountNumber) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Account number is required.' });
            }

            const paymentOptions = await UserPaymentOption.findOne({ uid });
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            // Find the bank detail with the matching account number
            const bank = paymentOptions.bank.find(bank => bank.accountNumber === accountNumber);

            // Check if the account number exists
            if (!bank) {
                return res.status(400).json({ message: 'Please enter the correct account number.' });
            }

            // Reset all other defaults
            paymentOptions.bank.forEach(bank => bank.status = 0);
            paymentOptions.upi.forEach(upi => upi.status = 0);
            paymentOptions.web3.forEach(web3 => web3.status = 0);

            // Set the found bank detail as default
            bank.status = 1;

            await paymentOptions.save();

            res.status(200).json({ message: 'Default bank detail set successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    // Set Default UPI Detail
    async setDefaultUPIDetail(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user
            const { upiId } = req.body;

            if (!upiId) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'UPI ID is required.' });
            }

            const paymentOptions = await UserPaymentOption.findOne({ uid });
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            // Find the bank detail with the matching account number
            const upi = paymentOptions.upi.find(upi => upi.upiId === upiId);

            // Check if the account number exists
            if (!upi) {
                return res.status(400).json({ message: 'Please enter the correct upi Id.' });
            }

            // Reset all other defaults
            paymentOptions.bank.forEach(bank => bank.status = 0);
            paymentOptions.upi.forEach(upi => upi.status = 0);
            paymentOptions.web3.forEach(web3 => web3.status = 0);

            // Set the found upi detail as default
            upi.status = 1;

            await paymentOptions.save();

            res.status(200).json({ message: 'Default UPI detail set successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    // Set Default Web3 Detail
    async setDefaultWeb3Detail(req, res) {
        try {
            const { uid } = req.user; // Assume uid is in req.user
            const { address } = req.body;

            if (!address) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Address is required.' });
            }

            const paymentOptions = await UserPaymentOption.findOne({ uid });
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            // Find the bank detail with the matching account number
            const web3 = paymentOptions.web3.find(web3 => web3.address === address);

            // Check if the account number exists
            if (!web3) {
                return res.status(400).json({ message: 'Please enter the correct address.' });
            }

            // Reset all other defaults
            paymentOptions.bank.forEach(bank => bank.status = 0);
            paymentOptions.upi.forEach(upi => upi.status = 0);
            paymentOptions.web3.forEach(web3 => web3.status = 0);

            // Set the found web3 detail as default
            web3.status = 1;

            await paymentOptions.save();

            res.status(200).json({ message: 'Default Web3 detail set successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


}
const payOutMethod = new USER_PAYMENT()
module.exports = payOutMethod;
