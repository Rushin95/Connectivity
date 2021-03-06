/*jshint esversion: 6 */

var dao = require('../utils/dao');
var bcrypt = require("bcrypt");
var logger = require("../utils/logger");
var photo_bo = require('./photo_bo');
var ObjectID = require('mongodb').ObjectID;


module.exports.fetchProfile = function(db, params, res) {
	console.log('params', params);
	var queryParams = {};
	if (exists(params.profile_id)) {
		queryParams.profile_id = params.profile_id;
	}
	if (exists(params.account)) {
		queryParams.account = params.account;
	}
	dao.fetchData('*', 'profile_details', queryParams, function(profile_result) {
		if (profile_result.length > 0) {
			if (exists(profile_result[0].profile_pic)) {
				db.get('photos').findOne({
					'_id': new ObjectID(profile_result[0].profile_pic)
				}).then(function(photo_result) {
					if (exists(photo_result)) {
						profile_result[0].profile_pic = photo_result.photo;
					}
					res.send({
						"status_code": 200,
						"message": profile_result
					});
				}, function(error) {
					throw error;
				});
			} else {
				res.send({
					"status_code": 200,
					"message": profile_result
				});
			}
		} else {
			res.send({
				"status_code": 500,
				"message": "Internal Error"
			});
		}
	})
};

module.exports.isUniqueIDProfile = function(uniqueID, profile_id, processResult) {
	dao.executeQuery('SELECT count(user_id) as count from account_details, profile_details where account = user_id and unique_id = ? and profile_id = ?', [uniqueID, profile_id], function(combination_result) {
		if (combination_result[0].count === 1) {
			processResult(true);
		} else {
			processResult(false);
		}
	})
};

module.exports.getIDFromUniqueID = function(uniqueID, processResult) {
	dao.executeQuery('select profile_id, user_id from profile_details, account_details where account = user_id and unique_id = ?', [uniqueID], function(profile_results) {
		processResult(profile_results[0].user_id, profile_results[0].profile_id);
	});
};

module.exports.updateProfile = function(db, params, res) {
	var updateParams = {};
	if (exists(params.fullname)) {
		updateParams.fullname = params.fullname;
	}
	if (exists(params.location)) {
		updateParams.location = params.location;
	}
	if (exists(params.profession)) {
		updateParams.profession = params.profession;
	}
	if (exists(params.about_me)) {
		updateParams.about_me = params.about_me;
	}
	if (exists(params.screen_name)) {
		updateParams.screen_name = params.screen_name;
	}
	updateParams.timestamp = getTimestamp();
	var queryParams = {};
	if (exists(params.profile_id)) {
		queryParams.profile_id = params.profile_id;
	} else {
		queryParams.account = params.account;
	}
	if (exists(params.profile_pic)) {
		photo_bo.setPhoto(db, params.profile_pic, function(photo_result) {
			updateParams.profile_pic = photo_result._id;
			dao.updateData('profile_details', updateParams, queryParams, function(profile_result) {
				if (profile_result.affectedRows === 1) {
					res.send({
						"status_code": 200,
						"message": "Update Success"
					});
				} else {
					res.send({
						"status_code": 500,
						"message": "Internal Error"
					});
				}
			})
		})
	} else {
		dao.updateData('profile_details', updateParams, queryParams, function(profile_result) {
			if (profile_result.affectedRows === 1) {
				res.send({
					"status_code": 200,
					"message": "Update Success"
				});
			} else {
				res.send({
					"status_code": 500,
					"message": "Internal Error"
				});
			}
		})
	}
};

// Follow profile
module.exports.followProfile = function(profile, following, res) {
	dao.insertData('follow_details', {
		'profile': profile,
		'following': following
	}, function(follow_result) {
		if (follow_result.affectedRows === 1) {
			res.send({
				"status_code": 200,
				"message": "Following"
			});
		} else {
			res.send({
				"status_code": 400,
				"message": "Internal Error"
			});
		}
	})
};


// Is profile public
module.exports.isPublicProfile = function(following, processResult) {
	dao.fetchData('public', 'preference_details', {
		'profile': following
	}, function(preference_result) {
		processResult(preference_result[0].public === 1)
	})
};

// Get id
module.exports.getIDFromEmail = function(friend_email, processResult) {
	dao.executeQuery('select profile_id, user_id from profile_details, account_details where account = user_id and email = ?', [friend_email], function(email_results) {
		processResult(email_results[0].user_id, email_results[0].profile_id);
	});
};

// Add friend
module.exports.addFriend = function(profile, friend, res) {
	dao.insertData('connection_details', {
		'profile': profile,
		'friend': friend,
		'pending': 1
	}, function(addfriend_result) {
		if (addfriend_result.affectedRows === 1) {
			res.send({
				"status_code": 200,
				"message": "Friend request sent."
			});
		} else {
			res.send({
				"status_code": 400,
				"message": "Internal Error"
			});
		}
	})
};



//Update Settings
module.exports.updateSettings = function(params, res) {
	updateParams = {}
	console.log(params.value);
	if (params.preference == 'profile_visibility') {
		if (params.value == '1')
			updateParams.public = 0; //if visibility is Friends Only
		else
			updateParams.public = 1; // if visiblity is public
	} else if (params.preference == 'email_notifications') {
		if (params.value == 'true') {
			updateParams.email_notification = 1; //if email notification is on
		} else {
			updateParams.email_notification = 0; //if email notification is off
		}
	} else if (exists(params.preference == 'push_notifications')) {
		if (params.value == 'true') {
			updateParams.push_notification = 1; //if email notification is on
		} else {
			updateParams.push_notification = 0; //if email notification is off
		}
	}
	queryParams = {}
	if (exists(params.profile_id)) {
		queryParams.profile = params.profile_id
	}

	dao.updateData('preference_details', updateParams, queryParams, function(settings_result) {
		console.log(settings_result)
		if (settings_result.affectedRows === 1) {
			res.send({
				"status_code": 200,
				"message": "Update Success"
			});
		} else {
			res.send({
				"status_code": 500,
				"message": "Internal Error"
			});
		}
	});
};

//Get profile which would be notified
module.exports.fetchReceivers = function(profile_id, processResult) {
	dao.executeQuery('select friend as receiver, screen_name as name from connection_details, profile_details where profile = profile_id and profile = ? and pending = 0 union select profile as receiver, screen_name as name from connection_details, profile_details where friend = profile_id and friend = ? and pending = 0 union select profile as receiver, screen_name as name from follow_details, profile_details where following = profile_id and following = ?', [profile_id, profile_id, profile_id], function(receiver_results) {
		processResult(receiver_results);
	});
};

module.exports.getSettingsFromUniqueID = function(unique_id, settingResults) {
	dao.executeQuery('select profile_id, user_id, email, pr.* from profile_details p, account_details a, preference_details pr where p.account = a.user_id and p.profile_id = pr.profile and unique_id = ?;', unique_id, function(setting_results) {
		settingResults(setting_results);
	});
};

//Get Sent Friend Request
module.exports.fetchSentRequest = function(profile_id, processResult) {
	dao.executeQuery('select friend as request_receiver, screen_name as name from connection_details, profile_details where connection_details.profile = ? and connection_details.pending = 1 and connection_details.friend = profile_details.profile_id;', [profile_id], function(sentRequest_results) {
		processResult(sentRequest_results);
	});
};

//Get new pending request
module.exports.fetchNewPendingRequest = function(profile_id, processResult) {
	dao.executeQuery('select profile as request_sender, screen_name as name from connection_details, profile_details where connection_details.profile = profile_details.profile_id and connection_details.friend = ? and pending = 1; ', [profile_id], function(newRequest_results) {
		processResult(newRequest_results);
	});
};

module.exports.acceptRequest = function(profile, friend, res) {
	dao.executeQuery("Update connection_details set pending = 0 where profile = ? and friend = ?", [friend, profile], function(result) {
		if (result.affectedRows === 1) {
			res.send({
				"status_code": 200,
				"message": "Friend Added"
			})
		} else {
			res.send({
				"status_code": 401,
				"message": "Internal Error"
			})
		}
	})
};

module.exports.declineRequest = function(profile, friend, res) {
	dao.executeQuery("delete from connection_details where profile = ? and friend = ?", [friend, profile], function(result) {
		if (result.affectedRows === 1) {
			res.send({
				"status_code": 200,
				"message": "Request Deleted"
			})
		} else {
			res.send({
				"status_code": 401,
				"message": "Internal Error"
			})
		}
	})
};

module.exports.searchProfile = function(search, res) {
	dao.executeQuery('select * from profile_details, account_details, preference_details where (user_id = account and email = ? and preference_details.profile = profile_details.profile_id) or (user_id = account and screen_name like ? and preference_details.profile = profile_details.profile_id and preference_details.public = 1);', [search, search + "%"], function(search_results) {
		if (search_results.length > 0) {
			res.send({
				'status_code': 200,
				'message': search_results
			});
		} else {
			res.send({
				'status_code': 204,
				'message': "No Match"
			});
		}
	});
};;
