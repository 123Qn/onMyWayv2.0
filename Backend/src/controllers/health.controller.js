const checkHealth = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Backend API is running!',
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    checkHealth
};