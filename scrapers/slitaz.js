var async = require('async');
var sugar = require('sugar');

function first(a) { return a[0]; }
function getLinks($) {
	return $('#content .list table .n a');
}
module.exports = function(request,callback) {
	var distributionurl = 'http://mirror.slitaz.org/iso/';
	request.dom(distributionurl,function(err,$) {
		if (err) { return callback(err); }
		var versions = getLinks($).filter(function(a) {
			// From 3.0 all releases should have hybrid isos, however at the moment 4.0 does not, so filter those.
			return !(['1.0','2.0','4.0'].find(a.text())) && (
				// The versions that are allowed (all x.x and rolling)
				(/^\d+(\.\d+)+$/).test(a.text()) || ['rolling'].find(a.text())
			);
		}).map(function(a) {
			return { name: a.text(), url: distributionurl+a.attr('href') +'/' };
		});
		var distribution = {
			id: 'slitaz',
			name: 'SliTaz',
			tags: ['hybrid'],
			url: 'http://www.slitaz.org/'
		};
		async.map(versions,function(version,callback) {
			request.dom(version.url,function(err,$) {
				if (err) { return callback(err); }
				var releases = getLinks($).filter(function(a) {
					return (/^slitaz-.*\.iso$/).test(a.text());
				}).map(function(a) {
					return a.attr('href');
				}).map(function(filename) {
					return {version: version.name,url:version.url+filename};
				});

				async.map(releases,function(release,callback) {
					request.contentlength(release.url,function(err,contentlength) {
						if (err) { return callback(err); }
						release.size = contentlength;
						callback(null,release);
					});
				},callback);
			});
		},function(err,releases) {
			if (err) { return callback(err); }
			
			// Hack to still have latest bootable stable version of SliTaz in distributionlist.
			releases.push({
				version: '4.0',
				url: 'http://softwarebakery.com/apps/drivedroid/distros/slitaz-4.0.iso',
				size: 36700160
			});

			distribution.releases = releases.flatten();
			callback(null,distribution);
		});
	});
};
